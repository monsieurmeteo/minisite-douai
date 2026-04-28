import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fullSafeBackup() {
    console.log("--- OPÉRATION SAUVEGARDE TOTALE (ÉVACUATION DES DONNÉES) ---");

    // 1. On récupère la liste de TOUTES les stations valides
    const { data: stations, error: stErr } = await supabase.from('stations').select('id, name');
    if (stErr) {
        console.error("Impossible de lire la liste des stations :", stErr.message);
        return;
    }
    console.log(`📡 ${stations.length} stations identifiées. Début de l'extraction...`);

    let allSavedData = [];
    let successCount = 0;
    let failCount = 0;

    // 2. On boucle sur chaque station (par petits groupes pour aller plus vite)
    const BATCH_SIZE = 10;
    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
        const batch = stations.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (s) => {
            try {
                const { data, error } = await supabase
                    .from('daily_summaries')
                    .select('*')
                    .eq('station_id', s.id)
                    .limit(2000); // On prend tout l'historique dispo

                if (!error && data && data.length > 0) {
                    return data;
                }
            } catch (e) { }
            return [];
        });

        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res.length > 0) {
                allSavedData = allSavedData.concat(res);
                successCount++;
            } else {
                failCount++;
            }
        });

        process.stdout.write(`Progression : ${i + batch.length}/${stations.length} stations traitées... (${allSavedData.length} lignes sauvées)\r`);

        // Petite pause pour ne pas faire sauter la connexion
        if (i % 50 === 0) await new Promise(r => setTimeout(r, 500));
    }

    // 3. Écriture du fichier final
    if (allSavedData.length > 0) {
        fs.writeFileSync('./tmp/FULL_BACKUP_CLIMATO.json', JSON.stringify(allSavedData, null, 2));
        console.log(`\n\n✅ SAUVEGARDE TERMINÉE !`);
        console.log(`📊 Résumé :`);
        console.log(`- Lignes récupérées : ${allSavedData.length}`);
        console.log(`- Stations avec données : ${successCount}`);
        console.log(`- Stations vides ou inaccessibles : ${failCount}`);
        console.log(`=> Fichier créé : tmp/FULL_BACKUP_CLIMATO.json`);
    } else {
        console.error("\n❌ ÉCHEC TOTAL : Aucune donnée n'a pu être extraite. La base est totalement murée.");
    }
}

fullSafeBackup();
