import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function fullDumpText() {
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        // Find a bloc that typically has content (ZON or DEP if NAT is empty)
        const bloc = textData.product.text_bloc_items.find(b => b.domain_id === 'ZDF_OUEST' || b.domain_id === 'FRA');
        console.log("Full Structure of first bloc_item:");
        console.log(JSON.stringify(bloc.bloc_items[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

fullDumpText();
