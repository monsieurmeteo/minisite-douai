
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.VITE_METEO_MANUAL_TOKEN;
const stationId = '35281001'; // Rennes

async function testPoste() {
    console.log(`Testing Rennes (35281001) with token: ${token.substring(0, 10)}...`);

    const dStart = new Date(Date.now() - 24 * 3600000);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date();

    // api-meteo-poste (DPAI01)
    const urlPoste = `https://public-api.meteofrance.fr/public/DPAI01/v1/station/horaire?id_station=${stationId}&date_debut=${dStart.toISOString()}&date_fin=${dEnd.toISOString()}`;

    const headers = {
        'apikey': token,
        'Accept': 'application/json'
    };

    try {
        console.log('--- Checking DPAI01 (Poste) ---');
        const res = await fetch(urlPoste, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log('Poste results:', data.length);
            if (data[0]) {
                console.log('Poste keys:', Object.keys(data[0]));
                console.log('Poste vv:', data[0].vv);
                console.log('Full first entry:', JSON.stringify(data[0], null, 2));
            }
        } else {
            console.log('Poste failed:', res.status);
            console.log(await res.text());
        }
    } catch (e) {
        console.error(e);
    }
}

testPoste();
