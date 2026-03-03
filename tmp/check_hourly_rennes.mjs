import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkHourlyRennes() {
    const stationId = '35281001';
    console.log(`Checking HOURLY data for station ${stationId}...`);

    const { data, error } = await supabase
        .from('observations_horaire')
        .select('*')
        .eq('station_id', stationId)
        .order('timestamp', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No hourly data found for this station.');
    } else {
        console.log(`Found ${data.length} recent hourly records:`);
        data.forEach(row => {
            console.log(`${row.timestamp}: T=${row.t}, RR1=${row.rr1}`);
        });
    }
}

checkHourlyRennes();
