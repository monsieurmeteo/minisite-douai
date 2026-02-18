import fs from 'fs';
import https from 'https';

const INITIAL_URL = 'https://www.data.gouv.fr/api/1/datasets/r/5ec141e4-3650-4365-82b1-db459efe690c';
const OUTPUT_FILE = 'src/data/stationNames.json';

console.log('🌍 Initialisation du téléchargement...');

function download(url) {
    https.get(url, (res) => {
        // Redirections
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`↪️ Redirection vers: ${res.headers.location}`);
            download(res.headers.location);
            return;
        }

        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            console.log('✅ Téléchargement terminé. Traitement...');
            processCSV(rawData);
        });

    }).on('error', (e) => {
        console.error(`❌ Erreur: ${e.message}`);
    });
}

function processCSV(csvContent) {
    try {
        const lines = csvContent.split('\n');
        // Detection separateur
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

        const idIndex = 0; // "ID" est toujours le premier champ dans ce fichier spécifique
        const nameIndex = headers.findIndex(h => h.match(/Nom|name/i));

        if (nameIndex === -1) {
            console.error("❌ Pas de colonne Nom trouvée.");
            return;
        }

        const stationMap = {};
        let count = 0;

        // Charger l'existant pour garder les overrides éventuels
        let existingNames = {};
        if (fs.existsSync(OUTPUT_FILE)) {
            try { existingNames = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch (e) { }
        }

        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return;
            const parts = line.split(separator);

            if (parts.length > Math.max(idIndex, nameIndex)) {
                let id = parts[idIndex]?.trim().replace(/"/g, '');
                let name = parts[nameIndex]?.trim().replace(/"/g, '');

                if (id && name) {
                    // Capitalisation ("AILLEVILLE" -> "Ailleville")
                    // On remplace aussi les _ par des espaces
                    name = name.toLowerCase().split(/[ _-]/).map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');

                    stationMap[id] = `${name} (${id})`;
                    count++;
                }
            }
        });

        console.log(`📊 Trouvé ${count} stations officielles !`);

        // On fusionne mais en donnant PRIORITÉ à notre liste officielle propre
        // sauf si l'existant a été édité manuellement... 
        // Ici on veut écraser les "Station XXX" de l'ancien fichier.
        // Donc on prend Official > Existing

        const finalMap = { ...existingNames, ...stationMap };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalMap, null, 2));
        console.log(`💾 Sauvegardé propre dans ${OUTPUT_FILE}`);

    } catch (e) {
        console.error('❌ Erreur parsing:', e);
    }
}

download(INITIAL_URL);
