import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charge les variables d'environnement (local ou GitHub Actions)
dotenv.config({ path: '.env.local' });

// Accepte VITE_SUPABASE_URL ou SUPABASE_URL (compatibilité GitHub Actions)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug: afficher quelles variables sont disponibles
console.log('🔑 VITE_SUPABASE_URL:', supabaseUrl ? '✅ défini' : '❌ manquant');
console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ défini' : '❌ manquant');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables Supabase manquantes! Vérifiez les secrets GitHub.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG = {
    baseUrl: process.env.VITE_APP_URL || 'https://minisite-douai.vercel.app',
    viewport: { width: 1200, height: 1500 },
    storageBucket: 'vigilance-captures',
    fileName: 'vigilance_france_latest.png'
};

const TEMP_DIR = './temp_captures';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const REGIONS = [
    { id: 'ARA', name: 'Auvergne-Rhône-Alpes' },
    { id: 'BFC', name: 'Bourgogne-Franche-Comté' },
    { id: 'BRE', name: 'Bretagne' },
    { id: 'CVL', name: 'Centre-Val de Loire' },
    { id: 'COR', name: 'Corse' },
    { id: 'GES', name: 'Grand Est' },
    { id: 'HDF', name: 'Hauts-de-France' },
    { id: 'IDF', name: 'Île-de-France' },
    { id: 'NOR', name: 'Normandie' },
    { id: 'NAQ', name: 'Nouvelle-Aquitaine' },
    { id: 'OCC', name: 'Occitanie' },
    { id: 'PDL', name: 'Pays de la Loire' },
    { id: 'PAC', name: 'Provence-Alpes-Côte d\'Azur' },
];

async function captureAndUpload() {
    console.log('\n📸 CAPTURE VIGILANCE (FRANCE & RÉGIONS)\n');

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport(CONFIG.viewport);

        const periods = [
            { id: 0, suffix: 'today' },
            { id: 1, suffix: 'tomorrow' }
        ];

        // 1. CAPTURE FRANCE (EXISTANT)
        for (const p of periods) {
            await captureScope(page, null, p.id, p.suffix);
        }

        // 2. CAPTURE RÉGIONS (NOUVEAU)
        for (const region of REGIONS) {
            console.log(`\n📍 CAPTURE RÉGION: ${region.name} (${region.id})`);
            for (const p of periods) {
                await captureScope(page, region.id, p.id, p.suffix);
            }
        }

        console.log(`\n✅ TOUTES LES CAPTURES RÉUSSIES!\n`);

    } catch (error) {
        console.error(`❌ Erreur globale:`, error.message);
    } finally {
        await browser.close();
    }
}

async function captureScope(page, regionId, periodId, suffix) {
    const scopeName = regionId ? `vigilance_region_${regionId}` : 'vigilance_france';
    const targetUrl = `${CONFIG.baseUrl}/vigilance?period=${periodId}${regionId ? `&region=${regionId}` : ''}`;
    
    console.log(`⏳ [${scopeName}] [${suffix}] Chargement: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Attendre le sélecteur
    try {
        await page.waitForSelector('#vigilance-social-card', { timeout: 15000 });
    } catch (e) {
        console.log(`⚠️ Timeout sélecteur, tentative d'injection brute...`);
    }

    // Injection CSS (Masquer tout sauf le conteneur de capture)
    const baseStyle = `
        .sidebar, .sidebar-card, .no-capture, .navbar, .top-nav, aside, .status-pill, .status-pill-new, .social-badges-overlay-bottom, .social-phenoms-footer-alt, .tabs-official, .dept-selector-inline { display: none !important; }
        .social-capture-container { display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 1200px !important; height: 1500px !important; z-index: 999999 !important; background: white !important; margin: 0 !important; padding: 0 !important; }
        body, html { background: white !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; width: 1200px !important; height: 1500px !important; }
    `;
    await page.addStyleTag({ content: baseStyle });

    // --- VERSION 1: CARTE SEULE (SANS TITRE) ---
    await page.addStyleTag({ content: '.social-fb-header { display: none !important; } .social-fb-body { padding-top: 0 !important; } .social-fb-map-area { margin-top: -100px !important; }' });
    await new Promise(r => setTimeout(r, 1500));
    
    const fileName1 = `${scopeName}_${suffix}.png`;
    const filePath1 = path.join(TEMP_DIR, fileName1);
    await page.screenshot({ path: filePath1, fullPage: true });

    const fileBuffer1 = fs.readFileSync(filePath1);
    await uploadToSupabase(fileName1, fileBuffer1);

    // --- VERSION 2: SOCIAL TITLE (AVEC TITRE) ---
    await page.addStyleTag({ content: '.social-fb-header { display: flex !important; }' });
    await new Promise(r => setTimeout(r, 1000));

    const fileName2 = `${scopeName}_${suffix}_social.png`;
    const filePath2 = path.join(TEMP_DIR, fileName2);
    await page.screenshot({ path: filePath2, fullPage: true });

    const fileBuffer2 = fs.readFileSync(filePath2);
    await uploadToSupabase(fileName2, fileBuffer2);

    // Historique Latest (uniquement pour France Demain)
    if (!regionId && periodId === 1) {
        await uploadToSupabase('vigilance_france_latest.png', fileBuffer1);
        await uploadToSupabase('vigilance_france_latest_social.png', fileBuffer2);
    }
}

async function uploadToSupabase(fileName, buffer) {
    const { error } = await supabase.storage
        .from(CONFIG.storageBucket)
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true,
            cacheControl: '60'
        });
    if (error) console.error(`❌ Erreur Upload ${fileName}:`, error.message);
    else console.log(`✅ Upload réussi: ${fileName}`);
}

captureAndUpload();
