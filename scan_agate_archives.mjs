
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.join(__dirname, 'orage');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

// Known dates with storms to test patterns
const testDates = ['20250128', '20240721', '20230615'];
const baseUrl = 'https://www.mwattest.fr';

const patterns = [
    // Direct date filenames
    (d) => `/ORAGE/images/foudre_${d}.jpg`,
    (d) => `/ORAGE/images/foudre${d}.jpg`,
    (d) => `/ORAGE/images/${d}.jpg`,
    (d) => `/ORAGE/cartes/foudre_${d}.jpg`,
    (d) => `/ORAGE/cartes/${d}.jpg`,
    (d) => `/ORAGE/archives/${d}.jpg`,
    (d) => `/ORAGE/archives/foudre_${d}.jpg`,
    // Subdirectories by year/month?
    (d) => `/ORAGE/images/${d.substr(0, 4)}/${d.substr(4, 2)}/${d.substr(6, 2)}/foudre.jpg`,
    (d) => `/ORAGE/images/${d.substr(0, 4)}/${d}/${d}.jpg`,
    // Maybe different extensions?
    (d) => `/ORAGE/images/foudre_${d}.png`,
];

async function checkAndDownload(urlPath, filename) {
    const fullUrl = baseUrl + urlPath;
    try {
        const res = await fetch(fullUrl, { method: 'GET' }); // GET directly to check content type/size
        if (res.ok) {
            const type = res.headers.get('content-type');
            if (type && type.includes('image')) {
                console.log(`[SUCCESS] Found image at ${fullUrl}`);
                const buffer = await res.arrayBuffer();
                fs.writeFileSync(path.join(targetDir, filename), Buffer.from(buffer));
                console.log(`Saved to ${filename}`);
                return true;
            } else {
                // sometimes 200 OK returns HTML "Not Found" page
                // console.log(`[Soft Fail] ${fullUrl} returned ${type}`);
            }
        }
    } catch (e) {
        // console.error(`[Error] ${fullUrl}: ${e.message}`);
    }
    return false;
}

async function run() {
    console.log("Starting scan for Agate archive images...");

    // First, check if the "current" foudre.jpg is accessible (baseline)
    await checkAndDownload('/ORAGE/images/foudre.jpg', 'current_foudre.jpg');

    let patternFound = null;

    for (const date of testDates) {
        console.log(`Testing patterns for date: ${date}`);
        for (let i = 0; i < patterns.length; i++) {
            const patternFn = patterns[i];
            const urlPath = patternFn(date);
            const filename = `test_${date}_p${i}.jpg`;

            const success = await checkAndDownload(urlPath, filename);
            if (success) {
                console.log(`!!! PATTERN DISCOVERED !!! Index ${i}`);
                patternFound = i;
                break; // Found a working pattern for this date!
            }
        }
    }

    if (patternFound !== null) {
        console.log(`\nPattern ${patternFound} seems to work. Ready to bulk download?`);
    } else {
        console.log("\nNo obvious archive pattern found in standard locations.");
    }
}

run();
