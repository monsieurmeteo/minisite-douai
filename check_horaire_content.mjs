import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('🔍 Inspection de la table HORAIRE...');

    const { count, error } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Nombre total de lignes : ${count}`);

    if (count > 0) {
        const { data } = await supabase
            .from('observations_horaire')
            .select('timestamp, station_id')
            .order('timestamp', { ascending: false })
            .limit(5);
        console.log('Dernières données :', data);
    } else {
        console.log('❌ La table est VIDE ! C\'est pour ça que la carte est blanche.');
    }
}

checkHoraire();
