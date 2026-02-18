import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking observations_6mn...");
    const { count, error } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Error:", error.message);
    } else {
        console.log(`✅ Success: ${count} records found in observations_6mn.`);
    }

    const { data: latest, error: err2 } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    if (latest && latest.length > 0) {
        console.log(`🕒 Latest record: ${latest[0].timestamp}`);
    }
}

check();
