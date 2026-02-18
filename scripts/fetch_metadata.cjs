const fs = require('fs');
const https = require('https');

const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';
const OAUTH_URL = 'https://portail-api.meteofrance.fr/token';

async function getToken() {
    console.log('Generating token...');
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const response = await fetch(OAUTH_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

async function fetchStations() {
    const token = await getToken();
    console.log('Token obtained. Fetching stations from 6mn data...');

    // Calculate a recent valid 6mn slot
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;
    const cycleTime = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        roundedMinutes,
        0,
        0
    ));
    cycleTime.setMinutes(cycleTime.getMinutes() - 12); // Go back 12 mins to be safe
    const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;
    console.log(`URL: ${url}`);

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch stations: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} stations.`);

    if (data.length > 0) {
        console.log('Sample station keys:', Object.keys(data[0]));
        console.log('Sample station:', data[0]);
    }

    // Create metadata map: ID -> Altitude
    const metadata = {};
    data.forEach(s => {
        // Check for altitude keys
        const alt = s.alti ?? s.altitude ?? s.alt ?? s.ALTI ?? null;
        if (alt !== null) {
            metadata[s.geo_id_insee || s.id] = alt;
        }
    });

    fs.writeFileSync('src/data/stationsMetadata.json', JSON.stringify(metadata, null, 2));
    console.log(`Saved src/data/stationsMetadata.json with ${Object.keys(metadata).length} entries.`);
}

fetchStations().catch(console.error);
