
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking 2026 completion...");
    const today = new Date();
    for (let d = 31; d >= 1; d--) {
        const start = `2026-01-${String(d).padStart(2, '0')}T00:00:00`;
        const end = `2026-01-${String(d).padStart(2, '0')}T23:59:59`;
        const { count } = await supabase.from('lightning_strikes')
            .select('*', { count: 'exact', head: true })
            .gte('strike_time', start)
            .lte('strike_time', end);
        console.log(`2026-01-${d}: ${count} strikes`);
    }
}
check();
