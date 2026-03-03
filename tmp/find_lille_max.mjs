
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findLilleMax() {
    const date = '2026-02-16';
    console.log(`Searching ALL observations for Nord (59) on ${date}...`);

    const { data: obs, error } = await supabase
        .from('observations_6mn')
        .select('timestamp, station_id, fxi')
        .gte('timestamp', `${date}T00:00:00Z`)
        .lte('timestamp', `${date}T00:30:00Z`)
        .ilike('station_id', '59%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${obs.length} observations in Nord for the first 30 mins of Feb 16.`);
    const lille = obs.filter(o => o.station_id === '59343001');
    lille.forEach(o => {
        console.log(`LILLE ${o.timestamp}: ${o.fxi} km/h`);
    });

    const otherHigh = obs.filter(o => o.fxi > 50);
    if (otherHigh.length > 0) {
        console.log('Other stations > 50 km/h:');
        otherHigh.forEach(o => console.log(`${o.station_id} ${o.timestamp}: ${o.fxi} km/h`));
    }
}

findLilleMax();
