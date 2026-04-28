import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
    console.log('--- DB STATUS CHECK ---');
    try {
        // 1. Check Latest Data
        const { data: latest, error: latError } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);

        if (latError) console.error('Latest Data Error:', latError.message);
        else console.log('Latest Timestamp in DB:', latest?.[0]?.timestamp || 'None');

        // 2. Check Table Stats via RPC (if possible) or direct query
        const { data: stats, error: statsError } = await supabase
            .rpc('get_table_stats', { table_name: 'observations_6mn' });

        if (statsError) {
            // Fallback: try to query pg_stat_user_tables directly if permissions allow
            // Usually need service role for this or the RPC must exist.
            const { data: rawStats, error: rawError } = await supabase
                .from('pg_stat_user_tables')
                .select('n_live_tup, n_dead_tup, last_vacuum')
                .eq('relname', 'observations_6mn')
                .single();

            if (rawError) console.log('Could not fetch dead tuples via API (unauthorized/missing RPC)');
            else console.log('Stats:', rawStats);
        } else {
            console.log('Stats from RPC:', stats);
        }

    } catch (e) {
        console.error('Check failed:', e.message);
    }
}

checkStatus();
