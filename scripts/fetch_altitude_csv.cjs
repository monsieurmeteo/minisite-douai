const https = require('https');
const fs = require('fs');

const URL = 'https://www.data.gouv.fr/api/1/datasets/r/5ec141e4-3650-4365-82b1-db459efe690c';
const OUTPUT_FILE = 'src/data/stationsMetadata.json';

function download(url) {
    console.log(`Downloading ${url}...`);
    https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`Redirecting to ${res.headers.location}...`);
            download(res.headers.location);
            return;
        }

        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            console.log('Download complete. Processing...');
            processCSV(rawData);
        });
    }).on('error', (e) => {
        console.error(`Error: ${e.message}`);
    });
}

function processCSV(csvContent) {
    try {
        const lines = csvContent.split('\n');
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

        console.log('Headers:', headers);

        const idIndex = 0; // "ID"
        const altIndex = headers.findIndex(h => h.match(/Altitude|Alt|Z/i));

        if (altIndex === -1) {
            console.error('Could not find Altitude column.');
            return;
        }

        console.log(`Altitude column index: ${altIndex} (${headers[altIndex]})`);

        const metadata = {};
        let count = 0;

        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return;
            const parts = line.split(separator);

            if (parts.length > Math.max(idIndex, altIndex)) {
                let id = parts[idIndex]?.trim().replace(/"/g, '');
                let alt = parts[altIndex]?.trim().replace(/"/g, '');

                if (id && alt && !isNaN(parseFloat(alt))) {
                    metadata[id] = parseInt(alt, 10);
                    count++;
                }
            }
        });

        console.log(`Found ${count} stations with altitude.`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);

    } catch (e) {
        console.error('Error parsing CSV:', e);
    }
}

download(URL);
