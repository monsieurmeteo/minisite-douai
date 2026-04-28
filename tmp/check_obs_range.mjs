import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkDateRange() {
    console.log("Checking date range for observations_6mn...");

    const { data: early } = await s.from('observations_6mn').select('timestamp').order('timestamp', { ascending: true }).limit(1);
    const { data: late } = await s.from('observations_6mn').select('timestamp').order('timestamp', { ascending: false }).limit(1);

    console.log("Earliest:", early?.[0]?.timestamp);
    console.log("Latest:", late?.[0]?.timestamp);

    const { count } = await s.from('observations_6mn').select('*', { count: 'exact', head: true });
    console.log("Total count:", count);
}

checkDateRange();
