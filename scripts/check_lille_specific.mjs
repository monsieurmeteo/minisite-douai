
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

async function checkLilleSpecific() {
    const stationId = '59343001'; // Lille Lesquin
    console.log(`Checking Lille (${stationId}) specific data points...`);

    // 1. Check Today ~01:42 Local -> ~00:42 UTC
    // Look for data between 00:30 UTC and 01:00 UTC on 2026-02-15
    const { data: dataToday, error: errToday } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-15T00:30:00')
        .lt('timestamp', '2026-02-15T01:00:00')
        .order('timestamp', { ascending: true });

    if (dataToday) {
        console.log("--- Today around 00:42 UTC (01:42 Local) ---");
        dataToday.forEach(d => console.log(`[${d.timestamp}] T=${d.t}°C`));
    } else {
        console.error("Error today:", errToday);
    }

    // 2. Check Yesterday ~23:24 Local -> ~22:24 UTC
    // Look for data between 22:15 UTC and 22:45 UTC on 2026-02-14
    const { data: dataYesterday, error: errYesterday } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-14T22:15:00')
        .lt('timestamp', '2026-02-14T22:45:00')
        .order('timestamp', { ascending: true });

    if (dataYesterday) {
        console.log("--- Yesterday around 22:24 UTC (23:24 Local) ---");
        dataYesterday.forEach(d => console.log(`[${d.timestamp}] T=${d.t}°C`));
    } else {
        console.error("Error yesterday:", errYesterday);
    }
}

checkLilleSpecific();
