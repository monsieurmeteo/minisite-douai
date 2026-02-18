
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking Dec 2025 day by day...");
    for (let d = 31; d >= 1; d--) {
        const start = `2025-12-${String(d).padStart(2, '0')}T00:00:00`;
        const end = `2025-12-${String(d).padStart(2, '0')}T23:59:59`;
        const { count } = await supabase.from('lightning_strikes')
            .select('*', { count: 'exact', head: true })
            .gte('strike_time', start)
            .lte('strike_time', end);
        if (count > 0) {
            console.log(`Day 2025-12-${d}: ${count} strikes`);
        } else {
            // console.log(`Day 2025-12-${d}: EMPTY`);
        }
    }
}
check();
