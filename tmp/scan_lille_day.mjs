
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function getMeteoToken() {
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    return data.access_token;
}

async function scanLilleDay() {
    const token = await getMeteoToken();
    const stationId = '59343001';

    // Scan all slots of the day
    const date = '2026-02-16T12:00:00Z'; // Just for the date part, API usually returns the slot

    console.log(`Scanning Lille ${stationId} for the whole day of Feb 16...`);

    // Use DPObs v1 station/infrahoraire-6m
    // To get multiple slots, we might need multiple calls or a different endpoint.
    // The public API station/infrahoraire-6m?date=... returns only one slot.
    // But paquet/stations/infrahoraire-6m?date=... returns all stations for ONE slot.

    // Let's try to check 00:12, 12:12, and other hours.
    const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    let maxGust = 0;

    for (const h of hours) {
        const hStr = h < 10 ? `0${h}` : h;
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${stationId}&date=2026-02-16T${hStr}:12:00Z&format=json`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
                const gust = data[0].fxi10 || data[0].fxi || 0;
                const kmh = Math.round(gust * 3.6);
                if (kmh > maxGust) maxGust = kmh;
                console.log(`${hStr}:12: ${kmh} km/h`);
            }
        }
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`MAX GUST FOUND AT :12 SLOTS: ${maxGust} km/h`);
}

scanLilleDay();
