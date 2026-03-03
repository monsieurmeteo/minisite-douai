import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRennes() {
    const stationId = '35281001';
    console.log(`Checking data for station ${stationId} in observations_6mn...`);

    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .order('timestamp', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data found for this station.');
    } else {
        console.log(`Found ${data.length} recent records:`);
        data.forEach(row => {
            console.log(`${row.timestamp}: T=${row.t}, U=${row.u}, FF=${row.ff}, FXI=${row.fxi}, RR=${row.rr_per}`);
        });
    }
}

checkRennes();
