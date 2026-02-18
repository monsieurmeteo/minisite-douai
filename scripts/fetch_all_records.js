import fs from 'fs';
import path from 'path';

const DATA_DIR = 'C:/Users/grego/Documents/minisite-douai/src/data';
const GEOJSON_PATH = path.join(DATA_DIR, 'stations_list.json');
const RECORDS_FILE = path.join(DATA_DIR, 'all_stations_records.json');

async function downloadRecords() {
    console.log("Démarrage du parsing ULTIME (v6 - Precise & Full)...");

    if (!fs.existsSync(GEOJSON_PATH)) {
        console.error("Le fichier json des stations est manquant.");
        return;
    }

    const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
    const features = geojson.features;
    const allRecords = {};

    const parseVals = (text) => {
        if (!text) return [];
        return text.split(';').map(v => v.trim()).filter(v => {
            if (v === '' || v === '.') return false;
            const n = v.replace(',', '.');
            return !isNaN(n) && n.length > 0;
        }).map(v => parseFloat(v.replace(',', '.')));
    };

    const parseDates = (text) => {
        if (!text) return [];
        return text.split(';').map(v => v.trim()).filter(v => {
            const vl = v.toLowerCase();
            if (vl === '' || vl.includes('date') || vl.includes('records') || vl.includes('période')) return false;
            // Catch anything that looks like a date: DD-YYYY, MM-YYYY, DD-MM-YYYY, or YYYY
            return /(\d{1,2}-\d{4})|(\d{4})|(\d{1,2}-\d{1,2}-\d{4})/.test(v);
        });
    };

    const collectAny = (lines, startIdx, parser, targetCount, maxLines = 8) => {
        let results = [];
        for (let offset = 0; offset < maxLines; offset++) {
            const row = lines[startIdx + offset];
            if (row === undefined) break;
            const items = parser(row);
            results = [...results, ...items];
            if (results.length >= targetCount) return results.slice(0, targetCount);
        }
        return results;
    };

    let processed = 0;
    const batchSize = 40;

    for (let i = 0; i < features.length; i += batchSize) {
        const batch = features.slice(i, i + batchSize);

        await Promise.all(batch.map(async (f) => {
            const stationId = f.properties.num;
            const url = `https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/REF_STATION/FICHECLIM_${stationId}.data`;

            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
                if (res.status === 200) {
                    const text = await res.text();
                    const lines = text.split('\n');

                    const data = {
                        name: f.properties.nom,
                        id: stationId,
                        tx: [], tn: [], pr: [], sun: [],
                        days: {
                            gel: [], heat: [], heat35: [], rain1: [], rain5: [], rain10: [],
                            snow: [], storm: [], fog: []
                        },
                        records: {
                            maxT: { vals: [], dates: [] },
                            minT: { vals: [], dates: [] },
                            maxRain: { vals: [], dates: [] },
                            maxWind: { vals: [], dates: [] }
                        }
                    };

                    lines.forEach((line, idx) => {
                        const l = line.toLowerCase();
                        // NORMALS
                        if (l.includes('température maximale (moyenne en °c)')) data.tx = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('température minimale (moyenne en °c)')) data.tn = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('précipitations : hauteur moyenne mensuelle (mm)')) data.pr = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('ensoleillement (moyenne en h)')) data.sun = collectAny(lines, idx, parseVals, 12);

                        // NEW PHENOMENA PARSING (Multi-phenomena lines)
                        if (l.includes('nombre moyen de jours avec : gel / neige / brouillard / orage / grêle')) {
                            const gelLine = lines[idx + 2];
                            const neigeLine = lines[idx + 3];
                            const brouillardLine = lines[idx + 4];
                            const orageLine = lines[idx + 5];
                            if (gelLine) data.days.gel = parseVals(gelLine).slice(0, 13);
                            if (neigeLine) data.days.snow = parseVals(neigeLine).slice(0, 13);
                            if (brouillardLine) data.days.fog = parseVals(brouillardLine).slice(0, 13);
                            if (orageLine) data.days.storm = parseVals(orageLine).slice(0, 13);
                        }

                        // OLD LABELS (Fallbacks)
                        if (l.includes('température maximale >= 30,0 °c')) data.days.heat = collectAny(lines, idx, parseVals, 13);
                        if (l.includes('température maximale >= 35,0 °c')) data.days.heat35 = collectAny(lines, idx, parseVals, 13);
                        if (l.includes('précipitations >= 1,0 mm')) data.days.rain1 = collectAny(lines, idx, parseVals, 13);
                        if (l.includes('hauteur quotidienne maximale (mm)')) {
                            // Rain records
                            data.records.maxRain.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.maxRain.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }

                        // TEMPERATURE RECORDS
                        if (l.includes('la température la plus élevée (°c)')) {
                            data.records.maxT.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.maxT.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                        if (l.includes('la température la plus basse (°c)')) {
                            data.records.minT.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.minT.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }

                        // WIND RECORDS
                        if (l.includes('vitesse maximale du vent (en m/s)')) {
                            const vms = collectAny(lines, idx, parseVals, 13);
                            data.records.maxWind.vals = vms.map(v => Math.round(v * 3.6));
                            data.records.maxWind.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                    });

                    if (data.tx.length > 0 || data.records.maxT.vals.length > 0) {
                        allRecords[stationId] = data;
                    }
                }
            } catch (e) { }
            processed++;
        }));
        if (processed % 100 === 0 || processed === features.length) {
            console.log(`Progression : ${processed}/${features.length}...`);
        }
    }

    fs.writeFileSync(RECORDS_FILE, JSON.stringify(allRecords));
    console.log(`Terminé ! ${Object.keys(allRecords).length} fiches enregistrées.`);
}

downloadRecords();
