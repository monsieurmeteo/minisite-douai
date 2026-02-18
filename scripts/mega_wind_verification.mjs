
import fs from 'fs';
import https from 'https';

const JSON_FILE = 'src/data/all_stations_records.json';
const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const ids = Object.keys(data);

console.log(`Starting thorough wind verification for ${ids.length} stations...`);

async function fetchStationWind(id) {
    const url = `https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/REF_STATION/FICHECLIM_${id.padStart(8, '0')}.data`;
    return new Promise((resolve) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return resolve(null);
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const lines = body.split('\n');
                const idx = lines.findIndex(l => l.includes('Rafale maximale de vent'));
                if (idx === -1) return resolve(null);

                const header = lines[idx];
                const values = lines[idx + 2] ? lines[idx + 2].split(';').slice(1).map(v => {
                    const parsed = parseFloat(v.trim().replace(',', '.'));
                    return isNaN(parsed) ? null : parsed;
                }) : null;

                if (!values) return resolve(null);

                let isKmh = header.includes('(km/h)');
                let isMs = header.includes('(m/s)');
                if (!isKmh && !isMs) {
                    const max = Math.max(...values.filter(v => v !== null));
                    isKmh = max > 100;
                }

                resolve({
                    vals: values.map(v => v !== null ? (isKmh ? v : v * 3.6) : null),
                    unit: isKmh ? 'km/h' : 'm/s'
                });
            });
        }).on('error', () => resolve(null));
    });
}

async function run() {
    let corrected = 0;
    let checked = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(id => fetchStationWind(id)));

        batch.forEach((id, idx) => {
            const result = results[idx];
            if (result && data[id].records && data[id].records.maxWind) {
                const oldMax = Math.max(...(data[id].records.maxWind.vals || []).filter(v => v !== null));
                const newMax = Math.max(...result.vals.filter(v => v !== null));

                if (Math.abs(oldMax - newMax) > 0.1) {
                    console.log(`✅ FIX: ${id} (${data[id].name}) ${oldMax.toFixed(1)} -> ${newMax.toFixed(1)} km/h (Source was ${result.unit})`);
                    data[id].records.maxWind.vals = result.vals;
                    corrected++;
                }
            }
            checked++;
        });

        process.stdout.write(`\rProgress: ${checked}/${ids.length} | Fixed: ${corrected}`);

        // Save intermediate to avoid data loss
        if (i % 200 === 0) {
            fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
        }
    }

    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
    console.log(`\n\n🎉 Verification finished.`);
    console.log(`📊 Stations checked: ${checked}`);
    console.log(`🛠️  Stations fixed: ${corrected}`);
}

run();
