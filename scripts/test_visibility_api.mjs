import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testVisibility() {
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    // Lille Lesquin
    const stationId = '59350001';
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    now.setUTCHours(now.getUTCHours() - 1);
    const dateStr = now.toISOString().split('.')[0] + 'Z';

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?id_station=${stationId}&date=${dateStr}&format=json`;

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();

    if (data.length > 0) {
        console.log("Keys:", Object.keys(data[0]).join(', '));
        console.log("Has 'vv'?", data[0].vv !== undefined, "Value:", data[0].vv);
    } else {
        console.log("No data");
    }
}

testVisibility();
