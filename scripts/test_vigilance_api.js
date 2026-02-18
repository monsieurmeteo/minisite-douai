import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

async function testVigilance() {
    console.log("Testing token with apikey header...");
    const response = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
        headers: {
            "apikey": token,
            "Accept": "application/json"
        }
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text.substring(0, 500) + "...");
}
testVigilance();
