
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

async function checkPerpignanWind() {
    const stationId = '66136001'; // Perpignan
    const todayStr = '2026-02-15';

    console.log(`Checking Wind for Perpignan (${stationId}) on ${todayStr}...`);

    // Check around 05:00 Local => 04:00 UTC
    const start = `${todayStr}T03:30:00`;
    const end = `${todayStr}T04:30:00`;

    const { data: early } = await supabase
        .from('observations_6mn')
        .select('timestamp, fxi, ff')
        .eq('station_id', stationId)
        .gte('timestamp', start)
        .lt('timestamp', end)
        .order('timestamp', { ascending: true });

    if (early) {
        console.log(`--- Data around 04:00 UTC (05:00 Local) ---`);
        early.forEach(d => console.log(`${d.timestamp} => Gust(fxi): ${d.fxi} km/h, Avg(ff): ${d.ff} km/h`));
    }

    // Get Daily Max from DB aggregation
    const { data: allDay } = await supabase
        .from('observations_6mn')
        .select('fxi')
        .eq('station_id', stationId)
        .gte('timestamp', `${todayStr}T00:00:00+01:00`) // Local start
        .lte('timestamp', `${todayStr}T23:59:59+01:00`)
        .order('fxi', { ascending: false })
        .limit(5);

    console.log("--- Top 5 Gusts Today (Local Time) ---");
    if (allDay) allDay.forEach(d => console.log(d.fxi));
}

checkPerpignanWind();
