import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log('--- 🔎 AUDIT DES EXTRÊMES (daily_summaries) ---');
    try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch 5000 recent records
        const { data: sample, error } = await supabase
            .from('daily_summaries')
            .select('station_id, date, temp_max, temp_min, rain_total, wind_gust_max')
            .order('date', { ascending: false })
            .limit(5000);

        if (error) throw error;

        const badTemps = sample.filter(d => d.temp_max !== null && d.temp_min !== null && d.temp_max < d.temp_min);
        const outliers = sample.filter(d =>
            (d.temp_max > 52) ||
            (d.temp_min < -38) ||
            (d.rain_total > 800) ||
            (d.wind_gust_max > 300)
        );

        console.log(`1. Échantillon de ${sample.length} enregistrements récents :`);
        if (badTemps.length > 0) {
            console.log(`   ❌ Incohérences Tx < Tn : ${badTemps.length}`);
            console.log('Exemples d\'erreurs Tx < Tn :', badTemps.slice(0, 5));
        } else {
            console.log(`   ✅ Aucune incohérence Tx < Tn trouvée dans l'échantillon.`);
        }

        if (outliers.length > 0) {
            console.log(`   ❌ Valeurs aberrantes physiques : ${outliers.length}`);
            console.log('Exemples d\'aberrations :', outliers.slice(0, 5));
        } else {
            console.log(`   ✅ Aucune valeur aberrante physique trouvée.`);
        }

        // 2. Count for Today
        const { count: todayCount } = await supabase
            .from('daily_summaries')
            .select('*', { count: 'exact', head: true })
            .eq('date', today);
        console.log(`\n2. Données pour aujourd'hui (${today}) : ${todayCount} stations.`);

    } catch (e) {
        console.error('Erreur audit:', e.message);
    }
}

inspect();
