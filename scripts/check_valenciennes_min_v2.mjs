
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkValenciennes() {
    // 15 Feb 2026
    const todayStr = '2026-02-15';
    const yesterdayStr = '2026-02-14';
    const stationId = '59606004'; // Valenciennes

    console.log(`Checking timestamps for Valenciennes (${stationId})...`);

    // 1. Min from 00:00 UTC Today
    const { data: dataUTC, error: errUTC } = await supabase
        .from('observations_6mn')
        .select('t, timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', `${todayStr}T00:00:00`)
        .order('t', { ascending: true })
        .limit(1);

    if (dataUTC && dataUTC.length > 0) {
        console.log(`Min T (00h UTC -> Now): ${dataUTC[0].t}°C at ${dataUTC[0].timestamp}`);
    } else {
        console.log("No data for 00h UTC range");
        if (errUTC) console.log(errUTC);
    }

    // 2. Min from 23:00 UTC Yesterday (which is 00:00 Local Winter)
    const { data: dataLocal } = await supabase
        .from('observations_6mn')
        .select('t, timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', `${yesterdayStr}T23:00:00`)
        .order('t', { ascending: true })
        .limit(1);

    if (dataLocal && dataLocal.length > 0) {
        console.log(`Min T (23h UTC Yesterday -> Now): ${dataLocal[0].t}°C at ${dataLocal[0].timestamp}`);
    } else {
        console.log("No data for Local day range");
    }

    // 3. Show a few records around 00:00 UTC
    const { data: dataAround, error: errAround } = await supabase
        .from('observations_6mn')
        .select('t, timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', `${yesterdayStr}T22:00:00`)
        .lt('timestamp', `${todayStr}T02:00:00`)
        .order('timestamp', { ascending: true });

    console.log("--- Obs around midnight (UTC) ---");
    if (dataAround) {
        dataAround.forEach(d => console.log(`${d.timestamp}: ${d.t}°C`));
    } else {
        console.log("No data around midnight", errAround);
    }
}

checkValenciennes();
