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

async function archiveYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`🚀 Début de l'archivage pour le : ${dateStr}`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // On ouvre la page avec les paramètres spéciaux d'automatisation
    const url = `http://localhost:5173/foudre?date=${dateStr}&automated=true&forcePoints=true`;

    try {
        await page.setViewport({ width: 1280, height: 1024 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // On attend que les impacts soient chargés (le sablier doit disparaître)
        await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 60000 });

        // Petit délai de sécurité pour le rendu Leaflet
        await new Promise(r => setTimeout(r, 2000));

        // Création du dossier archives si nécessaire
        const archiveDir = path.join(__dirname, '../public/archives-foudre');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
            console.log(`📁 Dossier créé : ${archiveDir}`);
        }

        const exportPath = path.join(archiveDir, `bilan-foudre-${dateStr}.png`);

        // Capture de la zone de la carte
        const element = await page.$('#map-export-container');
        await element.screenshot({ path: exportPath });

        console.log(`✅ Image enregistrée : ${exportPath}`);

        // NETTOYAGE SUPABASE
        // On ne supprime que si l'image a bien été créée
        if (fs.existsSync(exportPath)) {
            console.log(`🧹 Nettoyage de la base de données pour le ${dateStr}...`);

            // Conversion correcte : 00h00 et 23h59 heure locale => UTC
            const startLocal = new Date(`${dateStr}T00:00:00`);
            const endLocal = new Date(`${dateStr}T23:59:59`);

            const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000)).toISOString();
            const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000)).toISOString();

            console.log(`   Suppression de ${startUTC} à ${endUTC}`);

            const { error, count } = await supabase
                .from('lightning_strikes')
                .delete({ count: 'exact' })
                .gte('strike_time', startUTC)
                .lte('strike_time', endUTC);

            if (error) console.error("❌ Erreur lors de la suppression :", error);
            else console.log(`✨ ${count} impacts supprimés de la base de données !`);
        }

    } catch (e) {
        console.error("❌ Échec de l'archivage :", e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}

archiveYesterday();
