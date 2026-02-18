
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.VITE_METEO_MANUAL_TOKEN;
const stationId = '35281001'; // Rennes

async function testEndpoints() {
    console.log(`Testing Rennes (35281001) with token: ${token.substring(0, 10)}...`);

    // 1. Paquet Obs (6 min)
    const urlPaquet = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?id_station=${stationId}&format=json`;

    // 2. DPObs Temps Réel (Horaire)
    const urlTR = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}`;

    const headers = {
        'apikey': token,
        'Accept': 'application/json'
    };

    try {
        console.log('--- Checking DPPaquetObs ---');
        const resP = await fetch(urlPaquet, { headers });
        if (resP.ok) {
            const dataP = await resP.json();
            console.log('Paquet results:', dataP.length);
            if (dataP[0]) console.log('Paquet vv:', dataP[0].vv);
        } else {
            console.log('Paquet failed:', resP.status);
        }

        console.log('--- Checking DPObs (Temps Réel) ---');
        const resTR = await fetch(urlTR, { headers });
        if (resTR.ok) {
            const dataTR = await resTR.json();
            console.log('TR results:', Array.isArray(dataTR) ? dataTR.length : 'Object');
            const entry = Array.isArray(dataTR) ? dataTR[0] : dataTR;
            console.log('TR vv:', entry ? entry.vv : 'N/A');
            if (entry) console.log('All TR keys:', Object.keys(entry));
        } else {
            console.log('TR failed:', resTR.status);
        }
    } catch (e) {
        console.error(e);
    }
}

testEndpoints();
