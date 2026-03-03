import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectColumns() {
    const table = 'observations_6mn';
    console.log(`Inspecting columns of ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1).single();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Got a record:', JSON.stringify(data, null, 2));
    }
}

inspectColumns();
