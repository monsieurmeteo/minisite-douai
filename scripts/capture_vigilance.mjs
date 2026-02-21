import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charge les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CONFIG = {
    baseUrl: process.env.VITE_APP_URL || 'https://minisite-douai.vercel.app',
    viewport: { width: 1200, height: 1500 },
    storageBucket: 'vigilance-captures',
    fileName: 'vigilance_france_latest.png'
};

const TEMP_DIR = './temp_captures';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

async function captureAndUpload() {
    console.log('\n📸 CAPTURE VIGILANCE FRANCE (TODAY & TOMORROW)\n');

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

        for (const p of periods) {
            const targetUrl = `${CONFIG.baseUrl}/vigilance?period=${p.id}`;
            console.log(`\n🌐 [PERIOD ${p.id}] Chargement: ${targetUrl}`);

            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Attendre que la carte sociale soit prête
            console.log(`⏳ Attente du conteneur de capture...`);
            try {
                await page.waitForSelector('#vigilance-social-card', { timeout: 15000 });
            } catch (e) {
                await page.waitForSelector('.social-capture-container', { timeout: 5000 });
            }

            // Injection CSS de base
            const baseStyle = `
                .sidebar, .sidebar-card, .no-capture, .navbar, .top-nav, aside, .status-pill, .status-pill-new, .social-badges-overlay-bottom, .social-phenoms-footer-alt { display: none !important; }
                .social-capture-container { 
                    display: block !important; 
                    position: fixed !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    width: 1200px !important; 
                    height: 1500px !important; 
                    z-index: 999999 !important; 
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                body, html { 
                    background: white !important; 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    overflow: hidden !important; 
                    width: 1200px !important; 
                    height: 1500px !important;
                }
            `;
            await page.addStyleTag({ content: baseStyle });

            // --- VERSION 1: SANS TITRE ---
            console.log(`🖼️ Capture [${p.suffix}] Version 1: SANS TITRE...`);
            await page.addStyleTag({
                content: '.social-fb-header { display: none !important; } .social-fb-body { padding-top: 0 !important; } .social-fb-map-area { margin-top: -100px !important; }'
            });

            await new Promise(r => setTimeout(r, 2000));
            const fileName1 = `vigilance_france_${p.suffix}.png`;
            const filePath1 = path.join(TEMP_DIR, fileName1);
            await page.screenshot({ path: filePath1, fullPage: true });

            const fileBuffer1 = fs.readFileSync(filePath1);
            await supabase.storage
                .from(CONFIG.storageBucket)
                .upload(fileName1, fileBuffer1, {
                    contentType: 'image/png',
                    upsert: true,
                    cacheControl: '60'
                });

            // Si c'est Demain, on met aussi à jour le lien "latest" (historique)
            if (p.id === 1) {
                await supabase.storage
                    .from(CONFIG.storageBucket)
                    .upload('vigilance_france_latest.png', fileBuffer1, {
                        contentType: 'image/png',
                        upsert: true,
                        cacheControl: '60'
                    });
            }

            // --- VERSION 2: AVEC TITRE ---
            console.log(`🖼️ Capture [${p.suffix}] Version 2: AVEC TITRE...`);
            const socialFileName = `vigilance_france_${p.suffix}_social.png`;

            // On ré-affiche le header
            await page.addStyleTag({ content: '.social-fb-header { display: flex !important; }' });
            await new Promise(r => setTimeout(r, 1000));

            const filePath2 = path.join(TEMP_DIR, socialFileName);
            await page.screenshot({ path: filePath2, fullPage: true });

            const fileBuffer2 = fs.readFileSync(filePath2);
            await supabase.storage
                .from(CONFIG.storageBucket)
                .upload(socialFileName, fileBuffer2, {
                    contentType: 'image/png',
                    upsert: true,
                    cacheControl: '60'
                });

            // Si c'est Demain, on met aussi à jour le lien "latest_social" (historique)
            if (p.id === 1) {
                await supabase.storage
                    .from(CONFIG.storageBucket)
                    .upload('vigilance_france_latest_social.png', fileBuffer2, {
                        contentType: 'image/png',
                        upsert: true,
                        cacheControl: '60'
                    });
            }

            console.log(`✅ [PERIOD ${p.id}] Uploads réussis`);
        }

        console.log(`\n✅ TOUTES LES CAPTURES RÉUSSIES!\n`);

    } catch (error) {
        console.error(`❌ Erreur:`, error.message);
    } finally {
        await browser.close();
    }
}

captureAndUpload();
