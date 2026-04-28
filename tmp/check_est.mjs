import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { count: countObs } = await supabase.from('observations_6mn').select('*', { count: 'estimated', head: true });
    const { count: countDs } = await supabase.from('daily_summaries').select('*', { count: 'estimated', head: true });

    console.log(JSON.stringify({ obs_6mn: countObs, daily_summaries: countDs }, null, 2));
}

check();
