

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function getMeteoToken() {
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    return data.access_token;
}

async function fetchLilleRaw() {
    const token = await getMeteoToken();
    const stationId = '59343001';
    const date = '2026-02-16T00:12:00Z';

    console.log(`Fetching RAW data for ${stationId} at ${date}...`);

    const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${stationId}&date=${date}&format=json`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const data = await res.json();
        console.log('RAW DATA:', JSON.stringify(data, null, 2));
    } else {
        console.error('API Error:', res.status, await res.text());
    }
}

fetchLilleRaw();
