import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkRLS() {
    console.log('--- DIAGNOSTIC RLS ET ACCÈS PUBLIC ---');

    const clientAdmin = createClient(supabaseUrl, supabaseKey);
    const clientAnon = createClient(supabaseUrl, anonKey);

    // Test 1: Stations (Accès Rapide)
    const { data: stAdmin, count: stCountAd } = await clientAdmin.from('stations').select('*', { count: 'exact', head: true });
    console.log('Admin - Stations count:', stCountAd);

    const { data: stAnon, error: stErr, count: stCountAn } = await clientAnon.from('stations').select('*', { count: 'exact', head: true });
    if (stErr) console.error('❌ ANON - Erreur accès stations:', stErr.message);
    else console.log('ANON - Stations count:', stCountAn);

    // Test 2: Daily Summaries (Extrêmes Climato)
    const { count: dsCountAd } = await clientAdmin.from('daily_summaries').select('*', { count: 'exact', head: true });
    console.log('Admin - Daily Summaries count:', dsCountAd);

    const { error: dsErr, count: dsCountAn } = await clientAnon.from('daily_summaries').select('*', { count: 'exact', head: true });
    if (dsErr) console.error('❌ ANON - Erreur accès daily_summaries:', dsErr.message);
    else console.log('ANON - Daily Summaries count:', dsCountAn);

    // Test 3: Observations 6mn (Live)
    const { count: obsCountAd } = await clientAdmin.from('observations_6mn').select('*', { count: 'exact', head: true });
    console.log('Admin - Observations 6mn count:', obsCountAd);

    const { error: obsErr, count: obsCountAn } = await clientAnon.from('observations_6mn').select('*', { count: 'exact', head: true });
    if (obsErr) console.error('❌ ANON - Erreur accès observations_6mn:', obsErr.message);
    else console.log('ANON - Observations 6mn count:', obsCountAn);
}

checkRLS();
