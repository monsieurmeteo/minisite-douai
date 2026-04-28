import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- HEALTH CHECK ---");

    // Check daily_summaries
    console.time("daily_summaries_count");
    const { count: dsCount, error: dsErr } = await supabase.from('daily_summaries').select('*', { count: 'exact', head: true });
    console.timeEnd("daily_summaries_count");
    console.log(`Daily summaries count: ${dsCount}`, dsErr || '');

    // Check stations
    console.time("stations_count");
    const { count: stCount, error: stErr } = await supabase.from('stations').select('*', { count: 'exact', head: true });
    console.timeEnd("stations_count");
    console.log(`Stations count: ${stCount}`, stErr || '');

    // Check last observations_6mn
    const { data: latestObs } = await supabase.from('observations_6mn').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    console.log("Latest obs_6mn:", latestObs?.[0]?.timestamp);

    // Check extreme futures in daily_summaries
    const { data: futDs } = await supabase.from('daily_summaries').select('date').gt('date', '2026-03-09').limit(5);
    console.log("Future DS:", futDs);
}

diagnose();
