import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLatest() {
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('station_id, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Latest records in observations_6mn:`);
    data.forEach(row => {
        console.log(`${row.timestamp}: ${row.station_id}`);
    });
}

checkLatest();
