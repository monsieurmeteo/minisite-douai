import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Local ou Action
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runCronArchive() {
    try {
        console.log(`[CRON ARCHIVE] Démarrage de la routine...`);

        const { data: oldestData, error: oldestError } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: true })
            .limit(1);

        if (oldestError) throw oldestError;
        if (!oldestData || oldestData.length === 0) {
            console.log("[CRON ARCHIVE] La table est vide. Rien à faire.");
            return;
        }

        const oldestDate = new Date(oldestData[0].timestamp);
        const stopDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); 
        
        console.log(`[CRON ARCHIVE] Plus vieux record : ${oldestDate.toISOString()}`);
        console.log(`[CRON ARCHIVE] Seuil d'archivage (J-2) : ${stopDate.toISOString()}`);

        let currentDate = new Date(oldestDate);
        currentDate.setUTCHours(0,0,0,0);

        while (currentDate < stopDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            console.log(`\n[CRON ARCHIVE] Traitement de la journée : ${dateStr}`);
            
            await archiveDay(dateStr);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        
        console.log(`\n[CRON ARCHIVE] Routine terminée avec succès.`);
    } catch (err) {
        console.error("\n[CRON ARCHIVE] !!! ERREUR FATALE !!!");
        console.error(err.message || err);
        if (err.details) console.error("Détails:", err.details);
        if (err.hint) console.error("Indice:", err.hint);
        process.exit(1);
    }
}

async function archiveDay(targetDate) {
    console.log(`   -> Synchronisation des statistiques quotidiennes (batch_sync)...`);
    const { error: syncError } = await supabase.rpc('batch_sync_daily_summaries', { target_date: targetDate });
    if (syncError) {
        console.warn(`      ! Attention: Erreur lors du batch_sync pour ${targetDate}:`, syncError.message);
        // On continue quand même, car l'archivage est prioritaire pour la place disque
    }

    const BATCH_SIZE = 10000;
    let allRows = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('observations_6mn')
            .select('*')
            .gte('timestamp', `${targetDate}T00:00:00Z`)
            .lt('timestamp', `${targetDate}T23:59:59Z`)
            .range(from, from + BATCH_SIZE - 1)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
            allRows.push(...data);
            if (data.length < BATCH_SIZE) hasMore = false;
            else from += BATCH_SIZE;
        } else {
            hasMore = false;
        }
    }

    if (allRows.length > 0) {
        const [y, m, d] = targetDate.split('-');
        const filePath = `6mn/${y}/${m}/${d}.json`;
        console.log(`   -> ${allRows.length} lignes trouvées. Sauvegarde dans Storage...`);
        
        const { error: uploadError } = await supabase.storage
            .from('observations-archives')
            .upload(filePath, JSON.stringify(allRows), { contentType: 'application/json', upsert: true });

        if (uploadError) throw uploadError;

        console.log(`   -> Fichier sauvegardé. Suppression SQL progressive...`);
        
        // Suppression par paquets pour éviter les Timeouts
        let deletedCount = 0;
        const totalToDelete = allRows.length;
        
        // On supprime par tranches de 2h pour être sûr que ça passe
        for (let hour = 0; hour < 24; hour += 2) {
            const hStart = `${hour.toString().padStart(2, '0')}:00:00Z`;
            const hEnd = `${(hour + 2).toString().padStart(2, '0')}:00:00Z`;
            
            const { error: deleteError } = await supabase
                .from('observations_6mn')
                .delete()
                .gte('timestamp', `${targetDate}T${hStart}`)
                .lt('timestamp', `${targetDate}T${hEnd}`);
                
            if (deleteError) {
                console.error(`      ! Erreur lors de la suppression de la tranche ${hStart}-${hEnd}`);
                throw deleteError;
            }
        }

        console.log(`   -> Journée ${targetDate} archivée et nettoyée entièrement.`);
    } else {
        console.log(`   -> Aucune donnée pour le ${targetDate}.`);
    }
}

runCronArchive();
