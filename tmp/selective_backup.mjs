import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function selectiveBackup() {
    console.log("--- TENTATIVE DE SAUVEGARDE SÉLECTIVE (STATION PAR STATION) ---");

    // Liste des stations principales connues (Lille, etc.)
    const mainStations = ['59343001', '59178001', '59220002', '62742001'];

    let allSaved = [];

    for (const sid of mainStations) {
        console.log(`Extraction des résumés pour la station ${sid}...`);
        // On demande uniquement pour cette station
        const { data, error } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('station_id', sid)
            .limit(1000);

        if (error) {
            console.error(`❌ Échec pour ${sid} : ${error.message}`);
        } else {
            console.log(`✅ ${data.length} jours sauvés pour ${sid}.`);
            allSaved = allSaved.concat(data);
        }
    }

    if (allSaved.length > 0) {
        fs.writeFileSync('./tmp/selective_backup.json', JSON.stringify(allSaved, null, 2));
        console.log(`--- SAUVEGARDE TERMINÉE : ${allSaved.length} lignes sauvegardées. ---`);
    } else {
        console.error("Impossible de lire la moindre donnée valide. La base est totalement saturée.");
    }
}

selectiveBackup();
