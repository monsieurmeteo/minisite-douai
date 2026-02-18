import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkStatus() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📊 ÉTAT COMPLET DE LA BASE DE DONNÉES\n');
    console.log('='.repeat(70));

    // 1. Check 6mn data
    const { data: latest6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { count: count6mn } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true });

    console.log('\n📊 DONNÉES 6 MINUTES:');
    console.log(`   Total: ${count6mn} enregistrements`);
    console.log(`   Dernier relevé: ${latest6mn?.[0]?.timestamp}`);

    const now = new Date();
    const last6mnDate = new Date(latest6mn?.[0]?.timestamp);
    const delay6mn = Math.round((now - last6mnDate) / 60000);
    console.log(`   Retard: ${delay6mn} minutes`);

    // 2. Check hourly data
    const { data: latestHoraire } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { count: countHoraire } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true });

    console.log('\n📊 DONNÉES HORAIRES:');
    console.log(`   Total: ${countHoraire} enregistrements`);
    console.log(`   Dernier relevé: ${latestHoraire?.[0]?.timestamp}`);

    const lastHoraireDate = new Date(latestHoraire?.[0]?.timestamp);
    const delayHoraire = Math.round((now - lastHoraireDate) / 60000);
    console.log(`   Retard: ${delayHoraire} minutes`);

    console.log('\n🕐 Heure actuelle: ' + now.toISOString());
    console.log('='.repeat(70));

    // 3. Status summary
    console.log('\n✅ RÉSUMÉ:');
    if (delay6mn < 60) {
        console.log('   ✅ Données 6mn: À JOUR');
    } else {
        console.log(`   ⚠️  Données 6mn: RETARD de ${delay6mn} min`);
    }

    if (delayHoraire < 120) {
        console.log('   ✅ Données horaires: À JOUR');
    } else {
        console.log(`   ⚠️  Données horaires: RETARD de ${Math.round(delayHoraire / 60)}h`);
    }
}

checkStatus();
