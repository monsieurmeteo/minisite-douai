import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function fetchHourly() {
    console.log('🔄 Refreshing token...');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const authData = await resAuth.json();
    const token = authData.access_token;

    // Entre 1h et 7h UTC
    let current = new Date('2026-03-03T01:00:00Z');
    const end = new Date('2026-03-03T07:00:00Z');

    while (current <= end) {
        let dateStr = current.toISOString().split('.')[0] + 'Z';

        console.log('Fetching hourly', dateStr);
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=35281001&date=${dateStr}&format=json`;
        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data && data[0]) {
                    console.log('✅ Found data for', dateStr, 'Temp:', data[0].t);
                } else {
                    console.log('⚠️ No data from API for', dateStr);
                }
            } else {
                console.log('❌ Error from API for', dateStr, res.status);
            }
        } catch (e) {
            console.log('Error catching', dateStr, e.message);
        }

        await new Promise(r => setTimeout(r, 1000));
        current.setHours(current.getHours() + 1);
    }
}
fetchHourly();
