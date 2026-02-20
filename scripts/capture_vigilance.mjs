/**
 * 📸 CAPTURE + UPLOAD AUTOMATIQUE VIGILANCE FRANCE
 * 
 * Ce script:
 * 1. Capture un screenshot de la carte de vigilance (SVG)
 * 2. L'upload vers Supabase Storage
 * 3. L'image sera accessible via un lien permanent pour partage
 * 
 * Usage: node scripts/capture_vigilance.mjs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY est manquant");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const CONFIG = {
    baseUrl: 'http://localhost:5173',
    prodUrl: 'https://minisite-douai.vercel.app',
    viewport: { width: 1200, height: 1000 },
    storageBucket: 'vigilance-captures',
    fileName: 'vigilance_france_latest.png'
};

async function captureAndUpload() {
    console.log(`\n📸 CAPTURE VIGILANCE FRANCE\n`);

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport(CONFIG.viewport);

        // Essayer d'abord localhost, sinon prod
        let baseUrl = CONFIG.baseUrl;
        try {
            await page.goto(baseUrl, { timeout: 3000 });
        } catch {
            console.log('⚠️ Localhost non disponible, tentative sur prod...');
            baseUrl = CONFIG.prodUrl;
        }

        const targetUrl = `${baseUrl}/vigilance`;
        console.log(`🌐 Chargement: ${targetUrl}`);

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Attendre que le bloc complet soit présent
        console.log(`⏳ Attente du rendu complet...`);
        await page.waitForSelector('#vigilance-capture-full', { timeout: 15000 });

        // Cacher les éléments marqués "no-capture" (boutons, onglets, partage)
        await page.addStyleTag({ content: '.no-capture { display: none !important; }' });

        // Petit délai supplémentaire pour être sûr que tout est prêt
        await new Promise(r => setTimeout(r, 4000));

        const filePath = path.join(TEMP_DIR, CONFIG.fileName);

        // Screenshot du conteneur complet (Header + Map + Sidebar)
        const captureArea = await page.$('#vigilance-capture-full');

        if (captureArea) {
            await captureArea.screenshot({
                path: filePath,
                type: 'png',
                omitBackground: false
            });
            console.log('✅ Capture complète effectuée');
        } else {
            throw new Error('Élément #vigilance-capture-full non trouvé');
        }

        // Upload vers Supabase Storage
        console.log(`☁️ Upload vers Supabase Storage (${CONFIG.storageBucket})...`);
        const fileBuffer = fs.readFileSync(filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(CONFIG.storageBucket)
            .upload(CONFIG.fileName, fileBuffer, {
                contentType: 'image/png',
                upsert: true,
                cacheControl: '60' // Cache court de 1 minute
            });

        if (uploadError) {
            if (uploadError.message.includes('not found')) {
                console.log(`📦 Création du bucket "${CONFIG.storageBucket}"...`);
                await supabase.storage.createBucket(CONFIG.storageBucket, { public: true });
                const { error: retryError } = await supabase.storage
                    .from(CONFIG.storageBucket)
                    .upload(CONFIG.fileName, fileBuffer, { contentType: 'image/png', upsert: true, cacheControl: '60' });
                if (retryError) throw retryError;
            } else {
                throw uploadError;
            }
        }

        const { data: urlData } = supabase.storage
            .from(CONFIG.storageBucket)
            .getPublicUrl(CONFIG.fileName);

        console.log(`\n✅ CAPTURE ET UPLOAD RÉUSSIS!`);
        console.log(`   🔗 URL permanente: ${urlData.publicUrl}\n`);

    } catch (error) {
        console.error(`❌ Erreur:`, error.message);
    } finally {
        await browser.close();
    }
}

captureAndUpload();
