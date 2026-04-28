import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findBadData() {
    console.log("--- IDENTIFICATION DES DONNÉES À PURGER ---");

    // 1. Chercher les station_id bizarres (moins de 7 caractères par exemple)
    // On ne peut pas faire length() en Postgrest, on va essayer avec des jokers.

    console.log("Recherche de station_id < 7 caractères...");
    const { data: shortIds, error: e1 } = await supabase
        .from('daily_summaries')
        .select('station_id')
        .not('station_id', 'like', '_______%') // Moins de 7 caractères
        .limit(20);

    if (e1) console.error("Erreur 1:", e1);
    else console.log("Exemples d'IDs courts trouvés:", shortIds);

    // 2. Chercher les dates bizarres (très loin dans le passé ou futur)
    console.log("Recherche de dates invalides...");
    const { data: weirdDates, error: e2 } = await supabase
        .from('daily_summaries')
        .select('date, station_id')
        .or('date.lt.2024-01-01,date.gt.2027-01-01')
        .limit(20);

    if (e2) console.error("Erreur 2:", e2);
    else console.log("Exemples de dates invalides:", weirdDates);

    // 3. Compter les lignes pour station_id = '1'
    const { count: countOne, error: e3 } = await supabase
        .from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', '1');

    console.log("Nombre de lignes pour station_id='1':", countOne);
}

findBadData();
