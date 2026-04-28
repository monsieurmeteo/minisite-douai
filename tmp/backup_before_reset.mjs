import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function backupValidData() {
    console.log("--- TENTATIVE DE SAUVEGARDE DES DONNÉES PRÉCIEUSES ---");

    // On essaie de récupérer les 5000 dernières entrées valides de daily_summaries
    // On utilise un filtre très précis pour aider la base
    console.log("Extraction des 5000 derniers résumés quotidiens valides...");
    const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .like('station_id', '________') // Uniquement les IDs à 8 chiffres (les vrais)
        .order('date', { ascending: false })
        .limit(5000);

    if (error) {
        console.error("❌ Impossible d'extraire les données pour sauvegarde :", error.message);
        console.log("La base est trop saturée pour même nous laisser lire les bonnes données.");
    } else {
        console.log(`✅ Succès ! ${data.length} lignes valides ont été extraites.`);
        fs.writeFileSync('./tmp/backup_daily_summaries.json', JSON.stringify(data, null, 2));
        console.log("Sauvegarde effectuée dans tmp/backup_daily_summaries.json");
    }
}

backupValidData();
