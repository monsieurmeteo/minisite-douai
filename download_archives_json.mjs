
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// Période à scanner (exemple : depuis début 2024)
const START_DATE = new Date('2015-01-01');
const END_DATE = new Date(); // Aujourd'hui

const BASE_URL = 'https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php';
const PASS_KEY = 'jh2kH3,R';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'public', 'archives_orage');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

async function fetchDay(dateStr) {
    const url = `${BASE_URL}?date=${dateStr}&heureD=00&heureF=23&pass=${PASS_KEY}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data;
    } catch (e) {
        console.error(`Erreur pour ${dateStr}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log(`Démarrage de l'archivage dans ${OUTPUT_DIR}`);
    let current = new Date(START_DATE);

    while (current <= END_DATE) {
        const dateStr = formatDate(current);
        const fileName = path.join(OUTPUT_DIR, `orage_${dateStr}.json`);

        if (fs.existsSync(fileName)) {
            // console.log(`Déjà archivé : ${dateStr}`);
        } else {
            process.stdout.write(`Téléchargement ${dateStr}... `);
            const data = await fetchDay(dateStr);

            if (data && Array.isArray(data) && data.length > 0) {
                fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
                console.log(`✅ ${data.length} impacts.`);
            } else {
                console.log(`(Aucun impact)`);
            }
            // Pause seulement si on a fait une requête
            await new Promise(r => setTimeout(r, 100));
        }

        // Passer au jour suivant
        current.setDate(current.getDate() + 1);
    }
    console.log("Terminé !");
}

run();
