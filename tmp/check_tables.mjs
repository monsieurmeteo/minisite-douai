import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
    const tables = ['observations_6mn', 'meteo_6mn', 'observations_horaire', 'stations'];
    for (const table of tables) {
        console.log(`Checking table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table} error: ${error.message} (${error.code})`);
        } else {
            console.log(`✅ Table ${table} found. Got ${data.length} records.`);
        }
    }
}

checkTables();
