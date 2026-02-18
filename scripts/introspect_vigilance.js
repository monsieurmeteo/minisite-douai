import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function introspect() {
    const response = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
        headers: { "apikey": token, "Accept": "application/json" }
    });
    const data = await response.json();
    const p = data.product.periods[0];
    console.log("P0.timelaps keys:", Object.keys(p.timelaps));
    // It's likely an object or array. 
    // Usually it has a domain_ids array inside.
    if (Array.isArray(p.timelaps)) {
        console.log("P0.timelaps is array, len:", p.timelaps.length);
        console.log("P0.timelaps[0] keys:", Object.keys(p.timelaps[0]));
    } else {
        console.log("P0.timelaps keys:", Object.keys(p.timelaps));
        if (p.timelaps.domain_ids) {
            console.log("domain_ids count:", p.timelaps.domain_ids.length);
            console.log("domain_ids[0]:", JSON.stringify(p.timelaps.domain_ids[0]));
        }
    }
}
introspect();
