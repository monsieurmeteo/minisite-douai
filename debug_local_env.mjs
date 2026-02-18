
import fs from 'fs';

async function debugLocalEnv() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);
    const token = match ? match[1].trim() : null;

    if (!token) {
        console.error("❌ Token non trouvé dans .env.local");
        return;
    }

    console.log(`Using token starting with: ${token.substring(0, 20)}...`);

    const url = 'https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json';

    console.log("Testing apikey header...");
    const res = await fetch(url, { headers: { 'apikey': token, 'accept': 'application/json' } });
    console.log(`Status: ${res.status}`);
    const body = await res.text();
    console.log(`Body: ${body.substring(0, 200)}...`);
}

debugLocalEnv();
