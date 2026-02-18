import fs from 'fs';
import path from 'path';

const DATA_DIR = 'C:/Users/grego/Documents/minisite-douai/src/data';
const NAMES_PATH = path.join(DATA_DIR, 'stationNames.json');
const RECORDS_FILE = path.join(DATA_DIR, 'all_stations_records.json');

async function augmentRecords() {
    console.log("🚀 Démarrage de l'augmentation des fiches (Full synchronisation)...");

    if (!fs.existsSync(NAMES_PATH)) {
        console.error("Le fichier stationNames.json est manquant.");
        return;
    }

    const stationNames = JSON.parse(fs.readFileSync(NAMES_PATH, 'utf8'));
    let allRecords = {};
    if (fs.existsSync(RECORDS_FILE)) {
        allRecords = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
    }

    const allIds = Object.keys(stationNames);
    const missingIds = allIds.filter(id => !allRecords[id]);

    console.log(`📊 Statistiques : ${allIds.length} stations totales / ${Object.keys(allRecords).length} déjà en cache.`);
    console.log(`🔎 Scan de ${missingIds.length} stations manquantes...`);

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
    let found = 0;
    const batchSize = 40;

    for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);

        await Promise.all(batch.map(async (stationId) => {
            const url = `https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/REF_STATION/FICHECLIM_${stationId}.data`;

            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
                if (res.status === 200) {
                    const text = await res.text();
                    const lines = text.split('\n');

                    const data = {
                        name: stationNames[stationId].split(' (')[0],
                        id: stationId,
                        tx: [], tn: [], pr: [], sun: [],
                        days: { gel: [], heat: [], heat35: [], rain1: [], rain5: [], rain10: [], snow: [], storm: [], fog: [] },
                        records: {
                            maxT: { vals: [], dates: [] },
                            minT: { vals: [], dates: [] },
                            maxRain: { vals: [], dates: [] },
                            maxWind: { vals: [], dates: [] }
                        }
                    };

                    lines.forEach((line, idx) => {
                        const l = line.toLowerCase();
                        if (l.includes('température maximale (moyenne en °c)')) data.tx = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('température minimale (moyenne en °c)')) data.tn = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('précipitations : hauteur moyenne mensuelle (mm)')) data.pr = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('ensoleillement (moyenne en h)')) data.sun = collectAny(lines, idx, parseVals, 12);
                        if (l.includes('hauteur quotidienne maximale (mm)')) {
                            data.records.maxRain.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.maxRain.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                        if (l.includes('la température la plus élevée (°c)')) {
                            data.records.maxT.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.maxT.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                        if (l.includes('la température la plus basse (°c)')) {
                            data.records.minT.vals = collectAny(lines, idx, parseVals, 13);
                            data.records.minT.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                        if (l.includes('vitesse maximale du vent (en m/s)')) {
                            const vms = collectAny(lines, idx, parseVals, 13);
                            data.records.maxWind.vals = vms.map(v => Math.round(v * 3.6));
                            data.records.maxWind.dates = collectAny(lines, idx + 1, parseDates, 13, 10);
                        }
                    });

                    if (data.tx.length > 0 || data.records.maxT.vals.length > 0) {
                        allRecords[stationId] = data;
                        found++;
                    }
                }
            } catch (e) { }
            processed++;
        }));
        console.log(`Progression : ${processed}/${missingIds.length} (${found} fiches ajoutées)...`);

        // Sauvegarde régulière pour ne pas perdre la progression
        fs.writeFileSync(RECORDS_FILE, JSON.stringify(allRecords));
    }

    console.log(`✅ Augmentation terminée ! Total fiches : ${Object.keys(allRecords).length}`);
}

augmentRecords();
