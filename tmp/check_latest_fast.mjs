import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkLatest() {
    console.log('Checking latest data...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const { data, error } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);

        clearTimeout(timeoutId);

        if (error) {
            console.error('Error:', error.message);
        } else {
            console.log('Latest Timestamp:', data?.[0]?.timestamp);
        }
    } catch (e) {
        console.error('Fetch failed or timed out:', e.message);
    }
}

checkLatest();
