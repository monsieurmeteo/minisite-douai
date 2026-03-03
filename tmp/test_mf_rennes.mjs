// No import needed for fetch in Node 24

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function testRennes() {
    console.log('Refreshing token...');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const authData = await resAuth.json();
    const token = authData.access_token;
    console.log('Token obtained.');

    const sid = '35281001';
    const slots = [
        '2026-03-03T17:30:00Z',
        '2026-03-03T17:24:00Z',
        '2026-03-03T17:18:00Z',
        '2026-03-03T17:12:00Z',
        '2026-03-03T17:06:00Z',
        '2026-03-03T17:00:00Z'
    ];

    for (const date of slots) {
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${sid}&date=${date}&format=json`;
        console.log(`Fetching Rennes for ${date}...`);
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Success for ${date}:`, JSON.stringify(data[0]));
        } else {
            console.log(`❌ Failed for ${date}: ${res.status}`);
        }
    }
}

testRennes();
