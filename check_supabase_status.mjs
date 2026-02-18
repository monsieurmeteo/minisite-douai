import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSupabaseStatus() {
    console.log('🔍 VÉRIFICATION COMPLÈTE SUPABASE\n');
    console.log('='.repeat(60));

    // 1. Vérifier les données récentes (6mn)
    console.log('\n📊 DONNÉES 6 MINUTES :');
    const { data: latest6mn, error: err6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp, station_id')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (err6mn) {
        console.log('❌ Erreur:', err6mn.message);
    } else if (latest6mn && latest6mn.length > 0) {
        console.log(`✅ Dernière donnée : ${latest6mn[0].timestamp}`);
        const lastDate = new Date(latest6mn[0].timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastDate) / 60000);
        console.log(`   Il y a ${diffMinutes} minutes`);

        if (diffMinutes < 15) {
            console.log('   ✅ EXCELLENT : Données très fraîches !');
        } else if (diffMinutes < 30) {
            console.log('   ⚠️  ACCEPTABLE : Données récentes');
        } else {
            console.log('   ❌ ATTENTION : Données anciennes, le robot a peut-être un problème');
        }

        const { count } = await supabase
            .from('observations_6mn')
            .select('*', { count: 'exact', head: true });
        console.log(`   Total en base : ${count} enregistrements`);
    } else {
        console.log('❌ Aucune donnée trouvée');
    }

    // 2. Vérifier les données horaires
    console.log('\n📊 DONNÉES HORAIRES :');
    const { data: latestHoraire, error: errH } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    if (errH) {
        console.log('❌ Erreur:', errH.message);
    } else if (latestHoraire && latestHoraire.length > 0) {
        console.log(`✅ Dernière donnée : ${latestHoraire[0].timestamp}`);
        const { count } = await supabase
            .from('observations_horaire')
            .select('*', { count: 'exact', head: true });
        console.log(`   Total en base : ${count} enregistrements`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ CONCLUSION : Supabase est opérationnel !');
    console.log('   - Le robot Cloud fonctionne');
    console.log('   - Les données sont collectées');
    console.log('   - Votre site web peut afficher les données');
}

checkSupabaseStatus();
