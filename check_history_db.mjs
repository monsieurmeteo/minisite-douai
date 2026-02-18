import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkHistory() {
    console.log("Checking radar_history in Supabase...");

    const { data, error } = await supabase
        .from('radar_history')
        .select('*')
        .order('ts_value', { ascending: false })
        .limit(30);

    if (error) {
        console.error("Error fetching history:", error);
        return;
    }

    console.log(`Found ${data.length} records in radar_history.`);
    if (data.length > 0) {
        console.log("Latest:", data[0]);
        console.log("Oldest in top 30:", data[data.length - 1]);

        // Check gaps
        let prevTime = data[0].ts_value;
        for (let i = 1; i < data.length; i++) {
            const diff = prevTime - data[i].ts_value;
            if (diff !== 600) { // 10 minutes = 600 seconds
                console.log(`GAP detected between ${prevTime} and ${data[i].ts_value}: ${diff / 60} minutes`);
            }
            prevTime = data[i].ts_value;
        }
    }
}

checkHistory();
