import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function generateSql() {
    console.log("🔍 Fetching official list for SQL generation...");
    try {
        const mfResp = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json', {
            headers: { 'apikey': token }
        });

        const text = await mfResp.text();
        let sql = '-- SQL FIX FOR STATION NAMES\n';

        const lines = text.split('\n');
        let count = 0;
        lines.slice(1).forEach(l => {
            const cols = l.split(';');
            if (cols[0] && cols[2]) {
                const id = cols[0].trim();
                const name = cols[2].trim().replace(/'/g, "''");
                sql += `UPDATE public.stations SET name = '${name}' WHERE id = '${id}';\n`;
                count++;
            }
        });

        fs.writeFileSync('scripts/fix_station_names.sql', sql);
        console.log(`✅ SQL file generated: scripts/fix_station_names.sql (${count} updates)`);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

generateSql();
