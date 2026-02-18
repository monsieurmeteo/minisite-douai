import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function extremeDebug() {
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        const bloc = textData.product.text_bloc_items.find(b => b.bloc_items && b.bloc_items[0].text_items && b.bloc_items[0].text_items[0].term_items);
        if (!bloc) return console.log("No bloc found with terms");

        const term = bloc.bloc_items[0].text_items[0].term_items[0];
        console.log("KEYS of term:", Object.keys(term));
        console.log("CONTENT of term.text:", term.text);
    } catch (err) {
        console.error(err);
    }
}

extremeDebug();
