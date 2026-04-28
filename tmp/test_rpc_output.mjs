import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function getFuncDef() {
    const { data, error } = await supabase.rpc('get_func_def', { func_name: 'get_france_live' });
    // If get_func_def doesn't exist, we'll try a raw query via postgres catalog if possible
    // But since we can't do raw SQL via supabase-js unless we have a specific RPC, let's try something else.

    // Most Supabase projects have a way to run sql if configured, but let's assume not.
    // Let's just try to call it and see what it returns with a very large range.
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_france_live').range(0, 10);

    if (rpcErr) {
        console.error('RPC Error:', rpcErr.message);
    } else {
        console.log('RPC Sample Result:', JSON.stringify(rpcData, null, 2));
    }
}

getFuncDef();
