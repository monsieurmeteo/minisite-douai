
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking distribution...");
    const { data, error } = await supabase.rpc('get_lightning_stats_by_year'); // I don't know if this exists

    // If RPC doesn't exist, let's just query a few sample days.
    const years = [2026, 2025, 2024, 2023, 2022];
    for (const year of years) {
        const { count } = await supabase.from('lightning_strikes')
            .select('*', { count: 'exact', head: true })
            .gte('strike_time', `${year}-01-01`)
            .lt('strike_time', `${year + 1}-01-01`);
        console.log(`Year ${year}: ${count} strikes`);
    }
}
check();
