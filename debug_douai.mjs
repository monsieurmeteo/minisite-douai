import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Charger les variables d'environnement
const envContent = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkDouai() {
    console.log('🔍 Vérification des données pour Douai (59178001)...');

    // 1. Vérifier la dernière observation tout court
    const { data: lastObs, error: lastError } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', '59178001')
        .order('timestamp', { ascending: false })
        .limit(1);

    if (lastError) console.error('Erreur Last:', lastError);
    if (lastObs && lastObs.length > 0) {
        console.log(`✅ Dernière donnée reçue pour Douai : ${lastObs[0].timestamp}`);
    } else {
        console.log('⚠️ Aucune donnée trouvée pour Douai (jamais !).');
    }

    // 2. Vérifier pour aujourd'hui (date locale machine)
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Vérification pour la date : ${today}`);

    const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_extremes', {
        target_date: today
    });

    if (dailyError) console.error('Erreur RPC:', dailyError);

    if (dailyData) {
        const douai = dailyData.find(d => d.station_id === '59178001');
        if (douai) {
            console.log('✅ Douai est bien présent dans get_daily_extremes !', douai);
        } else {
            console.log(`❌ Douai ABSENT de get_daily_extremes pour ${today}.`);
            console.log(`📊 Nombre total de stations retournées : ${dailyData.length}`);
        }
    }
}

checkDouai();
