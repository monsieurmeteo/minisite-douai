import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Date de test
const TEST_DATE = '2015-04-18';

async function testArchive() {
    console.log("🧪 TEST D'ARCHIVAGE - Une seule date\n");
    console.log("=".repeat(60));
    console.log(`📅 Date de test : ${TEST_DATE}`);
    console.log("=".repeat(60) + "\n");

    const archiveDir = path.join(__dirname, '../public/archives-foudre');
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    const exportPath = path.join(archiveDir, `bilan-foudre-${TEST_DATE}.png`);

    console.log("🌐 Lancement du navigateur...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        const url = `http://localhost:5173/foudre?date=${TEST_DATE}&automated=true&forcePoints=true`;

        console.log(`📍 Navigation vers : ${url}`);
        await page.setViewport({ width: 1280, height: 1024 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

        console.log("⏳ Attente du chargement des impacts...");
        await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 120000 });

        console.log("⏳ Attente du rendu Leaflet (5 secondes)...");
        await new Promise(r => setTimeout(r, 5000));

        console.log("🔍 Vérification de l'élément #map-export-container...");
        const element = await page.$('#map-export-container');
        if (!element) {
            throw new Error('Élément #map-export-container non trouvé');
        }

        console.log("📏 Récupération des dimensions...");
        const boundingBox = await element.boundingBox();
        if (!boundingBox) {
            throw new Error('Impossible de déterminer les dimensions de l\'élément');
        }

        console.log(`   Dimensions : ${boundingBox.width}x${boundingBox.height} px`);
        console.log(`   Position : (${boundingBox.x}, ${boundingBox.y})`);

        console.log("📸 Capture de l'image...");
        await page.screenshot({
            path: exportPath,
            clip: {
                x: boundingBox.x,
                y: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height
            }
        });

        await page.close();

        const fileSize = fs.statSync(exportPath).size;
        console.log(`\n✅ Image créée avec succès !`);
        console.log(`   📁 Chemin : ${exportPath}`);
        console.log(`   💾 Taille : ${(fileSize / 1024).toFixed(2)} KB`);

        if (fileSize < 15000) {
            console.log(`\n⚠️  ATTENTION : L'image semble petite (${(fileSize / 1024).toFixed(0)} KB)`);
            console.log(`   Cela peut indiquer un problème de capture.`);
        } else {
            console.log(`\n🎉 La taille semble correcte !`);
        }

        console.log(`\n📋 Pour vérifier l'image :`);
        console.log(`   1. Ouvrir : ${exportPath}`);
        console.log(`   2. Ou aller sur : http://localhost:5173/foudre?date=${TEST_DATE}`);

    } catch (e) {
        console.error(`\n❌ Erreur : ${e.message}`);
        console.error(e.stack);
    } finally {
        await browser.close();
        console.log("\n" + "=".repeat(60));
    }
}

console.log("⚠️  Assurez-vous que le serveur dev tourne (npm run dev)\n");
console.log("Démarrage dans 3 secondes...\n");

setTimeout(() => {
    testArchive().catch(e => {
        console.error("❌ Erreur fatale:", e);
        process.exit(1);
    });
}, 3000);
