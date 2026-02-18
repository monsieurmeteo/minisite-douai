
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testFetch() {
    console.log("Checking Supabase connection...");
    console.log("URL:", process.env.VITE_SUPABASE_URL);

    // Check table count
    const { count, error: countErr } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error("Error accessing table:", countErr.message);
        return;
    }
    console.log("Total strikes in DB:", count);

    // Check recent data
    const { data, error } = await supabase
        .from('lightning_strikes')
        .select('*')
        .limit(5)
        .order('strike_time', { ascending: false });

    if (error) {
        console.error("Fetch error:", error.message);
    } else {
        console.log("Recent 5 strikes samples:");
        console.table(data);
    }
}

testFetch();
