import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkEverything() {
    console.log('--- DIAGNOSTIC PROFOND ---');

    // 1. Check if table exists and schema
    const { data: tables, error: tableErr } = await supabase.from('observations_6mn').select('*').limit(1);
    if (tableErr) {
        console.error('❌ Table observations_6mn access error:', tableErr.message);
        if (tableErr.message.includes('not found')) {
            console.error('   !!! LA TABLE N\'EXISTE PLUS !!!');
        }
    } else {
        console.log('✅ Table observations_6mn exists.');
    }

    // 2. Check get_france_live
    const { data: rpcD, error: rpcE } = await supabase.rpc('get_france_live');
    if (rpcE) {
        console.error('❌ RPC get_france_live error:', rpcE.message);
    } else {
        console.log('✅ RPC get_france_live exists, count:', rpcD.length);
    }

    // 3. Inspect last 5 rows of observations_6mn
    const { data: rows, error: rowErr } = await supabase
        .from('observations_6mn')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (rowErr) {
        console.error('❌ Rows fetch error:', rowErr.message);
    } else {
        console.log('Dernières lignes observations_6mn:');
        rows.forEach(r => console.log(`   - ${r.station_id} @ ${r.timestamp}`));
    }
}

checkEverything();
