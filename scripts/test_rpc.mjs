import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Calling get_france_live...");
    const { data, error } = await supabase.rpc('get_france_live');

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success! Data count:", data?.length);
    }
}

test();
