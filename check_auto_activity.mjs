import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkLatest() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('🔍 vérification activité automatique...\n');

    const { data: latest6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp, station_id')
        .order('timestamp', { ascending: false })
        .limit(1);

    const lastTS = latest6mn?.[0]?.timestamp;

    if (!lastTS) {
        console.log('❌ Aucune donnée trouvée');
        return;
    }

    const lastDate = new Date(lastTS);
    const now = new Date();
    // UTC+1 for display
    const lastDateFR = new Date(lastDate.getTime() + 60 * 60 * 1000);
    const nowFR = new Date(now.getTime() + 60 * 60 * 1000);

    console.log(`📊 Dernier relevé 6mn en base :`);
    console.log(`   UTC   : ${lastTS}`);
    console.log(`   France: ${lastDateFR.toISOString().replace('T', ' ').split('.')[0]}`);
    console.log(`\n🕐 Heure actuelle : ${now.toISOString()} UTC`);

    const diffMinutes = Math.floor((now - lastDate) / 60000);
    console.log(`\n⏱️  Âge des données : ${diffMinutes} minutes`);

    if (diffMinutes > 40) { // 40 min = marge large pour le délai API
        console.log('\n❌ CONCLUSION : Le système automatique NE SEMBLE PAS fonctionner.');
        console.log('   (Dernière donnée trop vieille)');
    } else {
        console.log('\n✅ CONCLUSION : Le système automatique SEMBLE FONCTIONNER !');
        console.log('   (Données récentes trouvées)');
    }
}

checkLatest();
