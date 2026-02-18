
import fs from 'fs';
import https from 'https';

const BASE_URL = 'https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/REF_STATION/';

// Load existing data
let recordsData = {};
try {
    recordsData = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
} catch (e) {
    console.log("Creating new records file...");
}

const listeFiches = JSON.parse(fs.readFileSync('src/data/liste_fiches_clim.json', 'utf8'));

/**
 * Same parsing logic as ClimatologyDashboard/climatologyService
 */
function parseData(text) {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim());

    const parseValues = (line) => {
        if (!line) return [];
        return line.split(';')
            .slice(1)
            .map(v => {
                const val = v.trim();
                if (val === '.' || val === '-' || val === '') return null;
                return parseFloat(val.replace(',', '.'));
            });
    };

    const parseDates = (line) => {
        if (!line) return [];
        return line.split(';')
            .slice(1)
            .map(v => v.trim() || null);
    };

    let maxWind = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Rafale maximale de vent')) {
            if (!lines[i + 2]?.includes('non disponibles')) {
                const rawVals = parseValues(lines[i + 2]);
                if (rawVals.some(v => v !== null)) {
                    // Explicit unit detection from header
                    const headerLine = lines[i];
                    let isKmh = headerLine.includes('(km/h)');
                    let isMs = headerLine.includes('(m/s)');

                    if (!isKmh && !isMs) {
                        // Fallback to logic if header is ambiguous
                        const maxVal = Math.max(...(rawVals.filter(v => v !== null)));
                        isKmh = maxVal > 100;
                    }

                    maxWind = {
                        period: lines[i + 1]?.match(/\d{2}-\d{2}-\d{4}/g),
                        vals: rawVals.map(v => v !== null ? (isKmh ? v : v * 3.6) : null),
                        dates: parseDates(lines[i + 3])
                    };
                }
            }
            break; // Found the section
        }
    }
    return maxWind;
}

function fetchStationData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 404) {
                resolve(null);
                return;
            }
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchStationData(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let blocks = [];
            res.on('data', chunk => blocks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(blocks);
                resolve(buffer.toString('latin1'));
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("🚀 Starting Global Wind Records Update (using .data files)...");

    const stations = listeFiches.features.map(f => ({
        id: f.properties.num,
        name: f.properties.nom
    }));

    console.log(`📊 Total stations to analyze: ${stations.length}`);

    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        const url = `${BASE_URL}FICHECLIM_${station.id}.data`;

        try {
            if (i % 20 === 0) {
                process.stdout.write(`\rProgress: ${i}/${stations.length} | Updated: ${updated} | Skipped: ${skipped}`);
            }

            const text = await fetchStationData(url);
            if (!text) {
                skipped++;
                continue;
            }

            const wind = parseData(text);
            if (wind) {
                if (!recordsData[station.id]) recordsData[station.id] = { name: station.name, records: {} };
                recordsData[station.id].records.maxWind = wind;
                updated++;
            } else {
                skipped++;
            }

            // Intermediate save
            if (updated > 0 && updated % 100 === 0) {
                fs.writeFileSync('src/data/all_stations_records.json', JSON.stringify(recordsData, null, 2));
            }

        } catch (e) {
            // console.error(`\nError for ${station.id}: ${e.message}`);
        }

        // Very small delay to respect server
        await new Promise(r => setTimeout(r, 10));
    }

    fs.writeFileSync('src/data/all_stations_records.json', JSON.stringify(recordsData, null, 2));
    console.log(`\n\n✅ DONE! Total stations updated with wind records: ${updated}`);
}

run();
