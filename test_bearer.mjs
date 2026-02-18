
import fs from 'fs';

async function testBearer() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);
    const token = match ? match[1].trim() : null;

    if (!token) return;

    const url = 'https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json';

    console.log("Testing Bearer header...");
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' } });
    console.log(`Status: ${res.status}`);
    const body = await res.text();
    console.log(`Body: ${body.substring(0, 200)}...`);
}

testBearer();
