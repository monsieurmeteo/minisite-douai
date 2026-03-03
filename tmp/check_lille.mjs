
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLilleData() {
    const { data: nordDaily, error: nordError } = await supabase
        .from('daily_summaries')
        .select('station_id, date, wind_gust_max')
        .eq('station_id', '07027')
        .gte('date', '2026-03-01')
        .lte('date', '2026-03-31')
        .limit(100);

    if (nordError) console.error('Error nord daily:', nordError);
    else {
        console.log(`Nord (59) daily summaries (${nordDaily.length} found):`);
        nordDaily.filter(d => d.date === '2026-02-16').forEach(d => {
            console.log(`${d.station_id} on ${d.date}: ${d.wind_gust_max} km/h`);
        });
    }

    // Check observations for Feb 16
    const { data: lilleObs, error: lilleError } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', '07027')
        .gte('timestamp', '2026-02-16T00:00:00Z')
        .lte('timestamp', '2026-02-16T23:59:59Z')
        .order('timestamp');

    if (lilleError) console.error('Error lille obs:', lilleError);
    else {
        console.log(`Lille (07027) observations for Feb 16 (${lilleObs.length} found):`);
        lilleObs.filter(o => o.fxi > 50).forEach(o => {
            console.log(`${o.timestamp}: fxi=${o.fxi} km/h, ff=${o.ff} km/h`);
        });
    }
}

checkLilleData();
