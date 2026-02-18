
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const supabaseKey = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

async function checkDatabase() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tables = ['observations_horaire', 'observations_6min'];

    for (const table of tables) {
        console.log(`\nChecking ${table} table...`);
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error(`Error fetching count for ${table}:`, error.message);
            } else {
                console.log(`Total records in ${table}: ${count}`);
            }

            const { data: latest, error: latestError } = await supabase
                .from(table)
                .select('timestamp, station_id')
                .order('timestamp', { ascending: false })
                .limit(3);

            if (latestError) {
                console.error(`Error fetching latest data for ${table}:`, latestError.message);
            } else if (latest && latest.length > 0) {
                console.log(`Latest records in ${table}:`);
                latest.forEach(r => console.log(`- ${r.timestamp} (Station: ${r.station_id})`));
            } else {
                console.log(`No data found in ${table}.`);
            }
        } catch (e) {
            console.error(`Unexpected error for ${table}:`, e);
        }
    }
}

checkDatabase();
