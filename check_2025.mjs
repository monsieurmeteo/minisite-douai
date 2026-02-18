
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking 2025 month by month...");
    for (let m = 12; m >= 1; m--) {
        const start = `2025-${String(m).padStart(2, '0')}-01`;
        const end = m === 12 ? `2026-01-01` : `2025-${String(m + 1).padStart(2, '0')}-01`;
        const { count } = await supabase.from('lightning_strikes')
            .select('*', { count: 'exact', head: true })
            .gte('strike_time', start)
            .lt('strike_time', end);
        console.log(`Month 2025-${m}: ${count} strikes`);
        if (count > 0) {
            // Check specific days in this month
            const { data: days } = await supabase.rpc('get_days_with_data', { year_val: 2025, month_val: m }); // If exists
            // Or just head samples
        }
    }
}
check();
