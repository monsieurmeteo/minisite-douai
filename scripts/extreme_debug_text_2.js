import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function extremeDebug2() {
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        const bloc = textData.product.text_bloc_items.find(b => b.bloc_items && b.bloc_items[0].text_items);
        const ti = bloc.bloc_items[0].text_items[0];
        console.log("KEYS of text_item (ti):", Object.keys(ti));
        console.log("bold_text:", ti.bold_text);
        console.log("text:", ti.text);

        if (ti.term_items) {
            console.log("KEYS of term_items[0]:", Object.keys(ti.term_items[0]));
            console.log("subdivision_text of term_items[0]:", ti.term_items[0].subdivision_text);
        }
    } catch (err) {
        console.error(err);
    }
}

extremeDebug2();
