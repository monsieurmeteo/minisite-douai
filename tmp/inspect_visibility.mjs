import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function inspectSchema() {
    console.log('--- INSPECTION SCHEMA ---');

    // Check definition of get_france_live
    const { data: funcDef, error: funcErr } = await supabase
        .rpc('get_france_live_definition', {}) // This probably won't work unless I added it
        .catch(() => ({ data: null, error: 'RPC not found' }));

    // Let's try to get it from postgres catalog
    const { data: catalog, error: catErr } = await supabase
        .from('pg_proc') // Use a view to access pg_proc if possible, but usually restricted
        .select('*')
        .limit(1);

    // Simpler: Just check if the data is visible to ANON user
    const anonSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonErr } = await anonSupabase
        .from('observations_6mn')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    console.log('Visibility for ANON user:');
    if (anonErr) console.error('   ❌ Error:', anonErr.message);
    else console.log('   ✅ Visible records:', anonData.length);

    // Call the RPC that the frontend uses
    const { data: rpcData, error: rpcErr } = await anonSupabase
        .rpc('get_france_live');

    console.log('RPC get_france_live result:');
    if (rpcErr) console.error('   ❌ Error:', rpcErr.message);
    else {
        console.log('   ✅ Records:', rpcData.length);
        if (rpcData.length > 0) {
            console.log('   First record timestamp:', rpcData[0].obs_time || rpcData[0].timestamp);
        }
    }
}

inspectSchema();
