import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('🔍 VÉRIFICATION DÉTAILLÉE DES DONNÉES HORAIRES\n');

    // Get last 10 hourly records
    const { data } = await supabase
        .from('observations_horaire')
        .select('timestamp, station_id')
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log('📊 Les 10 derniers relevés horaires:\n');

    if (data && data.length > 0) {
        data.forEach((record, i) => {
            const utcDate = new Date(record.timestamp);
            const frenchTime = new Date(utcDate.getTime() + 60 * 60 * 1000); // UTC+1
            console.log(`${i + 1}. ${record.timestamp} (UTC) = ${frenchTime.toLocaleString('fr-FR')} (heure française)`);
            console.log(`   Station: ${record.station_id}`);
        });
    } else {
        console.log('❌ Aucune donnée trouvée');
    }

    // Check if we have 14:00 UTC (15h française)
    const { data: data14h } = await supabase
        .from('observations_horaire')
        .select('count')
        .eq('timestamp', '2026-01-19T14:00:00+00:00');

    console.log(`\n🔍 Données pour 14h00 UTC (15h française): ${data14h?.length || 0} enregistrements`);

    // Check if we have 13:00 UTC (14h française)
    const { data: data13h } = await supabase
        .from('observations_horaire')
        .select('count')
        .eq('timestamp', '2026-01-19T13:00:00+00:00');

    console.log(`🔍 Données pour 13h00 UTC (14h française): ${data13h?.length || 0} enregistrements`);
}

checkHoraire();
