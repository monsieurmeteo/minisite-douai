import fs from 'fs';
import path from 'path';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function debugPhenomenonTimelines() {
    try {
        const mapRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const mapData = await mapRes.json();

        // Find a department with multiple risks or specific timelines
        const domain = mapData.product.periods[0].timelaps.domain_ids.find(d => d.phenomenon_items.length > 1);

        console.log("Structure of a domain's phenomenon_items:");
        process.stdout.write(JSON.stringify(domain.phenomenon_items[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

debugPhenomenonTimelines();
