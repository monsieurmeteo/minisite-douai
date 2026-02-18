import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function dumpVigilance() {
    const response = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
        headers: { "apikey": token, "Accept": "application/json" }
    });
    const data = await response.json();
    console.log("Keys in product:", Object.keys(data.product));
    console.log("Number of periods:", data.product.periods.length);
    const p0 = data.product.periods[0];
    console.log("Keys in p0:", Object.keys(p0));
    console.log("Keys in p0.timelaps_items[0]:", Object.keys(p0.timelaps_items[0]));
}
dumpVigilance();
