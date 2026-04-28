import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkHealth() {
    try {
        console.log("Testing connection...");
        const { data: test, error: errTest } = await supabase.from('api_secrets').select('*').limit(1);
        if (errTest) {
            console.error("Connection test failed:", errTest);
            return;
        }
        console.log("Connection OK.");

        console.log("Checking for active disk IO (trying to fetch recent data)...");
        const start = Date.now();
        const { data: recent, error: errRecent } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(10);
        const end = Date.now();

        if (errRecent) {
            console.error("Recent data fetch failed:", errRecent);
        } else {
            console.log(`Fetched 10 rows in ${end - start}ms`);
            console.log("Latest entries:", recent);
        }

        // Try to get table size via RPC if it exists, or just a simple query
        // Usually, we can't run arbitrary SQL via the client unless we have a specific RPC.
        
    } catch (e) {
        console.error("Fatal error:", e);
    }
}

checkHealth();
