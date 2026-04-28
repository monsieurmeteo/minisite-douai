import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function purgeSlowly() {
    console.log("--- PURGE PROGRESSIVE DES DONNÉES PARASITES ---");

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
        process.stdout.write(`Vérification des lignes invalides (Déjà supprimées : ${totalDeleted})...\r`);

        // On récupère une petite quantité de PK (station_id, date) pour les supprimer spécifiquement
        // On cible d'abord station_id='1' ou longueurs bizarres
        const { data, error } = await supabase
            .from('daily_summaries')
            .select('station_id, date')
            .not('station_id', 'like', '________') // Pas 8 caractères
            .limit(500);

        if (error) {
            console.error("\n❌ Erreur de lecture :", error.message);
            // Si timeout, on essaie un filtre encore plus précis
            break;
        }

        if (!data || data.length === 0) {
            console.log("\n✅ Plus aucune ligne invalide trouvée dans daily_summaries.");
            hasMore = false;
            break;
        }

        // Suppression chirurgicale de ces 500 lignes
        for (const row of data) {
            const { error: delErr } = await supabase
                .from('daily_summaries')
                .delete()
                .match({ station_id: row.station_id, date: row.date });

            if (!delErr) totalDeleted++;
        }

        if (totalDeleted > 5000) {
            console.log(`\n⏸️ Pause technique après ${totalDeleted} lignes pour laisser respirer la base.`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log("--- NETTOYAGE TERMINÉ ---");
    console.log(`Total supprimé : ${totalDeleted} lignes.`);
}

purgeSlowly();
