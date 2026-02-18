import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function inspectTextItems() {
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        const firstItem = textData.product.text_bloc_items[0].bloc_items[0].text_items[0];
        console.log("Structure of a text item:");
        console.log(JSON.stringify(firstItem, null, 2));
    } catch (err) {
        console.error(err);
    }
}

inspectTextItems();
