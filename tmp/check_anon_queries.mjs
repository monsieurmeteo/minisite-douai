import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkAccess() {
    console.log('--- TEST DES ERREURS EXACTES ANON ---');
    const clientAnon = createClient(supabaseUrl, anonKey);

    // Test 1: Daily Summaries
    const { data: ds, error: dsErr } = await clientAnon.from('daily_summaries')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);

    if (dsErr) console.error('❌ ANON - Erreur ds:', dsErr);
    else console.log('✅ ANON - daily_summaries ok. Count returned:', ds?.length);

    // Test 2: Stations
    const { data: st, error: stErr } = await clientAnon.from('stations')
        .select('*')
        .limit(5);

    if (stErr) console.error('❌ ANON - Erreur stations:', stErr);
    else console.log('✅ ANON - stations ok. Count returned:', st?.length);

    // Test 3: Observations 6mn
    const { data: obs, error: obsErr } = await clientAnon.from('observations_6mn')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (obsErr) console.error('❌ ANON - Erreur obs:', obsErr);
    else console.log('✅ ANON - observations ok. Last TS:', obs?.[0]?.timestamp);

    // Test 4: Extrêmes Climato (RPC get_daily_extremes_full)
    // "je n'ai pas de données pas de données dans extreme climato, impossible de choisir un poste meteo dans accès rapide etc..."
    const { data: ext, error: extErr } = await clientAnon.rpc('get_daily_extremes_full', { target_date: '2026-03-08' });
    if (extErr) console.error('❌ ANON - Erreur get_daily_extremes_full:', extErr);
    else console.log('✅ ANON - get_daily_extremes_full ok. Row count:', ext?.length);

    const extYest = await clientAnon.rpc('get_daily_extremes_full', { target_date: '2026-03-07' });
    console.log('✅ ANON - get_daily_extremes_full hier:', extYest.data?.length);
}

checkAccess();
