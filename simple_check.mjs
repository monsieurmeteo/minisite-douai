
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    const { data: min } = await supabase.from('lightning_strikes').select('strike_time').order('strike_time', { ascending: true }).limit(1);
    const { data: max } = await supabase.from('lightning_strikes').select('strike_time').order('strike_time', { ascending: false }).limit(1);
    const { count } = await supabase.from('lightning_strikes').select('*', { count: 'exact', head: true });

    console.log("MIN_DATE: " + (min?.[0]?.strike_time || "none"));
    console.log("MAX_DATE: " + (max?.[0]?.strike_time || "none"));
    console.log("TOTAL_COUNT: " + count);
}
check();
