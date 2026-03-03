
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

async function search70kmh() {
    const token = await getMeteoToken();
    const date = '2026-02-16T00:12:00Z';

    console.log(`Searching for any station in Nord (59) with ~70 km/h at ${date}...`);

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${date}&format=json`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

    if (res.ok) {
        const data = await res.json();
        const matches = data.filter(s => {
            const id = s.id || s.id_station || s.geo_id_insee || "";
            if (!id.startsWith('59')) return false;
            const gust = (s.fxi10 || s.fxi || 0) * 3.6;
            return gust >= 50; // Show anything over 50
        });

        matches.forEach(m => {
            console.log(`STATION ${m.id || m.id_station}: Gust ${Math.round((m.fxi10 || m.fxi) * 3.6)} km/h`);
        });

        if (matches.length === 0) console.log("No station found with > 50 km/h in Nord at this time.");
    } else {
        console.error("API Error");
    }
}

search70kmh();
