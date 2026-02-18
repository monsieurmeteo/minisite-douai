import fs from 'fs';
import path from 'path';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function generateJson() {
    console.log("🔍 Fetching official Meteo-France station list for JSON...");

    try {
        const mfResp = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json', {
            headers: { 'apikey': token }
        });

        if (!mfResp.ok) throw new Error(`MF API Error: ${mfResp.status}`);

        const text = await mfResp.text();
        const stationNames = {};

        if (text.includes(';')) {
            const lines = text.split('\n');
            lines.slice(1).forEach(l => {
                const cols = l.split(';');
                if (cols[0] && cols[2]) {
                    stationNames[cols[0].trim()] = `${cols[2].trim()} (${cols[0].trim()})`;
                }
            });
        } else {
            const list = JSON.parse(text);
            list.forEach(s => {
                stationNames[s.id_station] = `${s.nom_station} (${s.id_station})`;
            });
        }

        const targetPath = path.resolve(process.cwd(), 'src/data/stationNames.json');
        fs.writeFileSync(targetPath, JSON.stringify(stationNames, null, 2));

        console.log(`✅ File generated at ${targetPath} with ${Object.keys(stationNames).length} entries.`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

generateJson();
