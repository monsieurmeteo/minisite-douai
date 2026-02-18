
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'orage', 'json');
const IMG_DIR = path.join(__dirname, 'orage', 'images');
const TEMPLATE_PATH = path.join(__dirname, 'orage', 'map_template.html');

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

async function run() {
    console.log("Launching browser for map generation...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 2 });

    const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON archive files.`);

    // Read template
    let templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    for (const file of files) {
        // Filename format: orage_YYYYMMDD.json
        const datePart = file.replace('orage_', '').replace('.json', '');
        const imgName = `carte_foudre_${datePart}.jpg`;
        const imgPath = path.join(IMG_DIR, imgName);

        if (fs.existsSync(imgPath)) {
            // console.log(`Skipping ${datePart}, image exists.`);
            continue;
        }

        console.log(`Generating map for ${datePart}...`);

        const jsonData = fs.readFileSync(path.join(JSON_DIR, file), 'utf8');
        const data = JSON.parse(jsonData);

        // Filter valid data just in case
        const validData = Array.isArray(data) ? data : [];
        if (validData.length === 0) {
            console.log(`Skipping ${datePart} (no data points).`);
            continue;
        }

        // Inject data into template via a temporary HTML string or Page.evaluate
        // We will use setContent with injected global variables
        // Make sure data string is safe
        // Load template without data first
        await page.setContent(templateContent, { waitUntil: 'load' });

        // Inject data safely using evaluate
        await page.evaluate((data, dateStr) => {
            window.STORM_DATA = data;
            window.MAP_DATE = dateStr;
            // Trigger render manually if needed, or rely on the script checking window.STORM_DATA
            // We need to make sure the script in template runs AFTER this.
            // Actually, the template script runs on load.
            // Let's modify the template to wait or we re-trigger the rendering logic here.

            // Re-run the rendering logic:
            const mapData = window.STORM_DATA;
            const myRenderer = L.canvas({ padding: 0.5 });
            let count = 0;
            const map = window.map; // Access the map instance we made global in template? No, let's fix template too.

            // Simpler approach: Rewrite the logic in evaluate or make the template functions global.
            // Let's assume we update the template to have a render function.
        }, data, `${datePart.substr(6, 2)}/${datePart.substr(4, 2)}/${datePart.substr(0, 4)}`);

        // Now call the render function in the page
        await page.evaluate(() => {
            if (window.renderMap) window.renderMap();
        });

        // Wait for the marker div
        try {
            await page.waitForSelector('#ready-for-screenshot', { timeout: 5000 });
            // Add a delay for canvas rendering and tile loading
            await new Promise(r => setTimeout(r, 3000));

            await page.screenshot({
                path: imgPath,
                quality: 80,
                type: 'jpeg'
            });
            console.log(`Saved ${imgName}`);
        } catch (e) {
            console.error(`Error generating ${datePart}: ${e.message}`);
        }
    }

    await browser.close();
    console.log("Generation complete!");
}

run();
