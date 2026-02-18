import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function checkBulletinsJSON() {
    const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
        headers: { "apikey": token, "Accept": "application/json" }
    });
    const data = await textRes.json();
    if (data.product.text_bloc_items) {
        data.product.text_bloc_items.slice(0, 5).forEach(bloc => {
            console.log("--- BLOC ---");
            console.log("Domain ID:", bloc.domain_id);
            console.log("Domain Name:", bloc.domain_name);
            if (bloc.bloc_items) {
                bloc.bloc_items.forEach(item => {
                    console.log(`  Item ID: ${item.id}, Title: ${item.title}`);
                    if (item.text_items) {
                        console.log(`    Has ${item.text_items.length} segments`);
                        console.log(`    Text:`, item.text_items.join(" ").substring(0, 100));
                    }
                });
            }
        });
    }
}
checkBulletinsJSON();
