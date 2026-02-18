import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function listTables() {
    // We can't list tables directly with client key usually, but we can try to infer from likely names
    // or check if there is a 'records' table by selecting from it.

    const tables = ['records', 'daily_records', 'climatology', 'station_records', 'extremes_history'];

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        console.log(`Table '${t}':`, error ? `Error (${error.code})` : `Exists (Data: ${data.length} rows)`);
    }
}

listTables();
