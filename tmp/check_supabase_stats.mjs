import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkStats() {
    try {
        console.log("Checking row counts...");
        
        const { count: count6mn, error: err6mn } = await supabase
            .from('observations_6mn')
            .select('*', { count: 'exact', head: true });
        
        const { count: countH, error: errH } = await supabase
            .from('observations_horaire')
            .select('*', { count: 'exact', head: true });

        console.log("6mn Row Count:", count6mn);
        if (err6mn) console.error("Error 6mn:", err6mn);

        console.log("Hourly Row Count:", countH);
        if (errH) console.error("Error Hourly:", errH);

        // Fetch latest few rows to see the range
        const { data: latest6mn } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(5);

        console.log("Latest 6mn timestamps:", latest6mn?.map(d => d.timestamp));

        const { data: oldest6mn } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: true })
            .limit(5);

        console.log("Oldest 6mn timestamps:", oldest6mn?.map(d => d.timestamp));

    } catch (e) {
        console.error("Fatal error:", e);
    }
}

checkStats();
