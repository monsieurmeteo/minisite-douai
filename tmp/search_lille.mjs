
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getMeteoToken() {
    const auth = btoa('Mhar9YSs8LEluq4neXqP0YeHaaka:nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia');
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    return data.access_token;
}

async function searchLille() {
    const token = await getMeteoToken();
    const date = '2026-02-16T00:12:00Z';

    console.log(`Checking Bulk API for Lille at ${date}...`);

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${date}&format=json`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

    if (res.ok) {
        const data = await res.json();
        const lille = data.find(s => (s.id || s.id_station || s.geo_id_insee) === '59343001');

        if (lille) {
            console.log('LILLE FOUND IN BULK API:', JSON.stringify(lille, null, 2));
            console.log(`Gust in km/h: ${Math.round((lille.fxi10 || lille.fxi) * 3.6)}`);
        } else {
            console.log('LILLE NOT FOUND IN BULK API for this slot.');

            // Try individual fetch
            console.log('Attempting individual fetch for Lille...');
            const urlIndiv = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=59343001&date=${date}&format=json`;
            const resIndiv = await fetch(urlIndiv, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resIndiv.ok) {
                const dataIndiv = await resIndiv.json();
                console.log('LILLE INDIVIDUAL FETCH:', JSON.stringify(dataIndiv, null, 2));
            } else {
                console.log('LILLE INDIVIDUAL FETCH FAILED:', resIndiv.status);
            }
        }
    } else {
        console.error("API Error:", res.status);
    }
}

searchLille();
