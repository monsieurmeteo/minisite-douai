import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkVisibility() {
    console.log('🔍 Vérification des données de visibilité pour Rennes St Jacques (35281001)...\n');

    // Vérifier les données récentes
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('station_id, timestamp, t, u, ff, vv')
        .eq('station_id', '35281001')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Erreur:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ Aucune donnée trouvée pour cette station');
        return;
    }

    console.log('📊 Dernières observations:');
    data.forEach(obs => {
        console.log(`  ${obs.timestamp} - T: ${obs.t}°C, VV: ${obs.vv !== null ? `${obs.vv}m` : 'N/A'}`);
    });

    // Vérifier si la colonne vv a des données
    const { data: vvData } = await supabase
        .from('observations_6mn')
        .select('station_id, vv')
        .not('vv', 'is', null)
        .limit(10);

    console.log(`\n📈 Nombre de stations avec visibilité (échantillon): ${vvData?.length || 0}`);

    if (vvData && vvData.length > 0) {
        console.log('📋 Exemples de stations avec visibilité:');
        vvData.slice(0, 5).forEach(obs => {
            console.log(`  Station ${obs.station_id}: ${obs.vv}m (${(obs.vv / 1000).toFixed(1)} km)`);
        });
    }
}

checkVisibility();
