import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data } = await supabase.from('observations_6mn')
        .select('timestamp, t')
        .eq('station_id', '35281001')
        .gte('timestamp', '2026-03-03T00:00:00Z')
        .lte('timestamp', '2026-03-03T07:00:00Z')
        .order('timestamp');
    const out = data.map(d => `${d.timestamp} ${d.t}`).join('\n');
    fs.writeFileSync('tmp/cat_all2.out', out, 'utf-8');
}
test();
