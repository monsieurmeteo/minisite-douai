import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function checkSubdivision() {
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        const bloc = textData.product.text_bloc_items.find(b => b.bloc_items && b.bloc_items[0].text_items && b.bloc_items[0].text_items[0].term_items);
        const term = bloc.bloc_items[0].text_items[0].term_items[0];
        console.log("Type of first element in subdivision_text:", typeof term.subdivision_text[0]);
        console.log("Keys of first element:", Object.keys(term.subdivision_text[0]));
        console.log("Full first element:", JSON.stringify(term.subdivision_text[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

checkSubdivision();
