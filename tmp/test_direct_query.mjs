import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function testQuery() {
    console.log("--- TEST DIRECT QUERY ---");
    console.time("Direct Query");

    // Equivalent of get_france_live: get latest obs for each station in last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: false })
        .limit(2500); // 2000 stations = ~2000 rows if we only take latest... wait, it will take multiple timestamps for same station.

    console.timeEnd("Direct Query");

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Received ${data.length} rows.`);
        // Deduplicate in JS
        const latest = new Map();
        for (const row of data) {
            if (!latest.has(row.station_id)) {
                latest.set(row.station_id, row);
            }
        }
        console.log(`After deduplication: ${latest.size} stations.`);
    }
}

testQuery();
