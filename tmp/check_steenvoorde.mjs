import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSteenvoorde() {
    const stationId = '59580003';
    console.log(`Checking data for station ${stationId} (Steenvoorde) in observations_6mn...`);
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-03-03T00:00:00Z')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} records for today.`);
        if (data.length > 0) console.log(`Latest: ${data[0].timestamp}: T=${data[0].t}`);
    }
}

checkSteenvoorde();
