import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chargement manuel de l'environnement
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Clés Supabase manquantes dans .env.local");
    process.exit(1);
}

const supabase = createClient(
    urlMatch[1].trim(),
    keyMatch[1].trim()
);

// Configuration
const START_DATE = '2026-01-23'; // On commence par HIER
const END_DATE = '2015-01-01';   // On remonte jusqu'au début
const BATCH_SIZE = 5;            // Plus petit batch pour stabilité
const DELAY_BETWEEN_BATCHES = 2000;

function getDatesReverse(start, end) {
    const dates = [];
    let current = new Date(start);
    const stopDate = new Date(end);

    while (current >= stopDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() - 1);
    }
    return dates;
}

// ... (Même helper hasData)
async function hasData(dateStr) {
    const startLocal = new Date(`${dateStr}T00:00:00`);
    const endLocal = new Date(`${dateStr}T23:59:59`);
    const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000)).toISOString();
    const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000)).toISOString();

    const { count } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact', head: true })
        .gte('strike_time', startUTC)
        .lte('strike_time', endUTC);

    return (count || 0) > 0;
}

async function archiveDate(dateStr, browser) {
    const archiveDir = path.join(__dirname, '../public/archives-foudre');
    const exportPath = path.join(archiveDir, `bilan-foudre-${dateStr}.png`);

    if (fs.existsSync(exportPath)) {
        console.log(`   ⏭️  ${dateStr} : Déjà fait`);
        return { success: true, skipped: true };
    }

    if (!(await hasData(dateStr))) {
        console.log(`   ⚪ ${dateStr} : Pas de données`);
        return { success: true, skipped: true, noData: true };
    }

    try {
        const page = await browser.newPage();
        const url = `http://localhost:5173/foudre?date=${dateStr}&automated=true&forcePoints=true`;

        await page.setViewport({ width: 1280, height: 1024 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

        await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 120000 });
        await new Promise(r => setTimeout(r, 5000)); // Attente rendu Leaflet

        const element = await page.$('#map-export-container');
        if (!element) throw new Error('Conteneur carte introuvable');

        const box = await element.boundingBox();
        if (!box) throw new Error('Dimensions introuvables');

        await page.screenshot({
            path: exportPath,
            clip: { x: box.x, y: box.y, width: box.width, height: box.height }
        });

        await page.close();
        console.log(`   ✅ ${dateStr} : Image créée (${(fs.statSync(exportPath).size / 1024).toFixed(0)} KB)`);

        // Suppression
        const startLocal = new Date(`${dateStr}T00:00:00`);
        const endLocal = new Date(`${dateStr}T23:59:59`);
        const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000)).toISOString();
        const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000)).toISOString();

        const { count } = await supabase
            .from('lightning_strikes')
            .delete({ count: 'exact' })
            .gte('strike_time', startUTC)
            .lte('strike_time', endUTC);

        console.log(`   🧹 ${dateStr} : ${count || 0} supprimés`);
        return { success: true, deleted: count };

    } catch (e) {
        console.error(`   ❌ ${dateStr} : Erreur - ${e.message}`);
        return { success: false, error: e.message };
    }
}

async function run() {
    console.log("🚀 ARCHIVAGE INVERSÉ (2026 -> 2015)");
    const dates = getDatesReverse(START_DATE, END_DATE);
    console.log(`📅 ${dates.length} dates à traiter`);

    const browser = await puppeteer.launch({ headless: "new" });

    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Lot ${i / BATCH_SIZE + 1} (${batch[0]} -> ${batch[batch.length - 1]})`);
        await Promise.all(batch.map(d => archiveDate(d, browser)));
        if (i + BATCH_SIZE < dates.length) await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    await browser.close();
}

run();
