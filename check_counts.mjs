
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const supabaseKey = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

async function checkDatabase() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const tables = ['observations_horaire', 'observations_6mn'];

    for (const table of tables) {
        console.log(`\nChecking ${table} table...`);
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error for ${table}:`, error.message);
        } else {
            console.log(`Total records in ${table}: ${count}`);
        }
    }
}

checkDatabase();
