import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkRLSAndData() {
    console.log('--- CHECK RLS & RPC ---');

    // 1. Get total count as service_role
    const { count: total6mn } = await supabase.from('observations_6mn').select('*', { count: 'exact', head: true });
    console.log('Total records in observations_6mn (Service Role):', total6mn);

    // 2. Try as anon
    const anonSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonErr, count: anonCount } = await anonSupabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true });

    if (anonErr) {
        console.error('❌ ANON Error:', anonErr.message);
    } else {
        console.log('Visible records for ANON:', anonCount);
    }

    // 3. Test the RPC specifically
    const { data: rpcData, error: rpcErr } = await anonSupabase.rpc('get_france_live');
    if (rpcErr) {
        console.error('❌ RPC Error:', rpcErr.message);
    } else {
        console.log('RPC result count:', rpcData ? rpcData.length : 0);
        if (rpcData && rpcData.length > 0) {
            console.log('First RPC record:', rpcData[0]);
        }
    }
}

checkRLSAndData();
