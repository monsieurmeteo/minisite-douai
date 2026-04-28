import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function targetedDelete() {
    console.log("--- CHIRURGIE CIBLÉE SUR LA BASE DE DONNÉES ---");

    // On cible les stations fantômes identifiées dans le CSV fautif
    const badIds = ['1', 'POSTE', 'id', 'geo_id_insee', 'DATE'];

    for (const sid of badIds) {
        console.log(`Tentative de purge de la station fantôme : "${sid}"...`);
        // On tente de supprimer TOUTES les lignes pour cet ID d'un coup
        // Même si ça prend du temps, le serveur devrait traiter l'ordre si l'index sur station_id fonctionne.
        const { error, count } = await supabase
            .from('daily_summaries')
            .delete({ count: 'exact' })
            .eq('station_id', sid);

        if (error) {
            console.error(`❌ Échec pour "${sid}" : ${error.message}`);
        } else {
            console.log(`✅ Réussite ! ${count || 0} lignes fantômes "${sid}" ont été éradiquées.`);
        }

        const { error: err2, count: count2 } = await supabase
            .from('observations_6mn')
            .delete({ count: 'exact' })
            .eq('station_id', sid);

        if (!err2) {
            console.log(`✅ Réussite ! ${count2 || 0} observations fantômes "${sid}" supprimées.`);
        }
    }

    console.log("--- OPÉRATION TERMINÉE ---");
}

targetedDelete();
