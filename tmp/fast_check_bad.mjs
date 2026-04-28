import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking station_id lengths and counts in daily_summaries...");

    // Since we can't do GROUP BY easily with JS client (without RPC), 
    // let's try to see if '1' exists and how many.
    const { count, error } = await s.from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', '1');

    console.log(`Rows with station_id='1': ${count}`, error || "");

    const { count: c8, error: e8 } = await s.from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .not('station_id', 'like', '________');

    console.log(`Rows with station_id NOT 8 chars: ${c8}`, e8 || "");

    // Check for some other common bad IDs
    const { data: samples } = await s.from('daily_summaries')
        .select('station_id')
        .limit(10);
    console.log("Samples:", samples);
}

check();
