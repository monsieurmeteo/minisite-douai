
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkLightning() {
    console.log("⚡ Vérification de l'état de la récupération des orages...");

    // Trouver la date la plus ancienne
    const { data: minData, error: minError } = await supabase
        .from('lightning_strikes')
        .select('strike_time')
        .order('strike_time', { ascending: true })
        .limit(1);

    // Trouver la date la plus récente
    const { data: maxData, error: maxError } = await supabase
        .from('lightning_strikes')
        .select('strike_time')
        .order('strike_time', { ascending: false })
        .limit(1);

    if (minError || maxError) {
        console.error("Erreur lors de la récupération des données:", minError || maxError);
        return;
    }

    if (minData.length === 0) {
        console.log("Aucune donnée d'orage trouvée dans la base.");
        return;
    }

    const minDate = new Date(minData[0].strike_time);
    const maxDate = new Date(maxData[0].strike_time);

    console.log(`📅 Date la plus ancienne : ${minDate.toLocaleString('fr-FR')}`);
    console.log(`📅 Date la plus récente : ${maxDate.toLocaleString('fr-FR')}`);

    // Compter le nombre total d'impacts
    const { count, error: countError } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total d'impacts enregistrés : ${count}`);

    // Vérifier les 24 dernières heures pour voir si c'est en cours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { count: recentCount } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact', head: true })
        .gt('strike_time', oneDayAgo.toISOString());

    console.log(`📈 Impacts ajoutés/récents (dernières 24h) : ${recentCount}`);
}

checkLightning();
