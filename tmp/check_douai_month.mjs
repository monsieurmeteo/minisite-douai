import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function checkDouai() {
    const { data, error } = await supabase
        .from('daily_summaries')
        .select('date, rain_total')
        .eq('station_id', '59178001')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28')
        .order('date');
    if (error) console.error(error);
    console.log(data);

    let sum = 0;
    data.forEach(d => {
        sum += d.rain_total || 0;
    });
    console.log('Total Douai Feb:', sum);
}
checkDouai();
