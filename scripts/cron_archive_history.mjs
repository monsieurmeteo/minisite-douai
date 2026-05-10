import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[CRON ARCHIVE] ❌ Variables Supabase manquantes !');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCronArchive() {
    console.log(`[CRON ARCHIVE] Démarrage — ${new Date().toISOString()}\n`);

    try {
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
        const stopDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Seuil à J-1 (24h) au lieu de J-2

        console.log(`[CRON ARCHIVE] Plus vieux record : ${oldestDate.toISOString()}`);
        console.log(`[CRON ARCHIVE] Seuil d'archivage (J-2) : ${stopDate.toISOString()}`);

        let currentDate = new Date(oldestDate);
        currentDate.setUTCHours(0, 0, 0, 0);

        while (currentDate < stopDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            console.log(`\n[CRON ARCHIVE] Traitement de la journée : ${dateStr}`);
            await archiveDay(dateStr);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        console.log(`\n[CRON ARCHIVE] ✅ TERMINÉ.`);
    } catch (err) {
        console.error('\n[CRON ARCHIVE] ❌ ERREUR FATALE:', err.message || err);
        process.exit(1);
    }
}

async function archiveDay(targetDate) {
    // 1. Sync daily summaries
    console.log(`   -> Synchronisation des statistiques quotidiennes (batch_sync)...`);
    const { error: syncError } = await supabase.rpc('batch_sync_daily_summaries', { target_date: targetDate });
    if (syncError) {
        console.warn(`      ⚠️ Avertissement batch_sync: ${syncError.message}`);
    }

    // 2. Fetch data and save to a temporary file to avoid RAM issues
    const BATCH_SIZE = 1000;
    let from = 0;
    let hasMore = true;
    let totalRows = 0;
    
    const tempFilePath = path.join(process.cwd(), `temp_archive_${targetDate}.json`);
    const writeStream = fs.createWriteStream(tempFilePath);
    writeStream.write('[');
    let isFirst = true;

    console.log(`   -> Téléchargement et création du fichier JSON en local...`);
    
    while (hasMore) {
        const { data, error } = await supabase
            .from('observations_6mn')
            .select('*')
            .gte('timestamp', `${targetDate}T00:00:00Z`)
            .lt('timestamp', `${targetDate}T23:59:59Z`)
            .range(from, from + BATCH_SIZE - 1)
            .order('timestamp', { ascending: true });

        if (error) {
            fs.unlinkSync(tempFilePath);
            throw error;
        }
        
        if (data && data.length > 0) {
            for (const row of data) {
                if (!isFirst) writeStream.write(',');
                writeStream.write(JSON.stringify(row));
                isFirst = false;
            }
            totalRows += data.length;
            if (data.length < BATCH_SIZE) hasMore = false;
            else from += BATCH_SIZE;
        } else {
            hasMore = false;
        }
    }
    
    writeStream.write(']');
    writeStream.end();

    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    if (totalRows > 0) {
        console.log(`   -> ${totalRows} lignes trouvées. Upload vers Supabase Storage...`);
        const [y, m, d] = targetDate.split('-');
        const filePath = `6mn/${y}/${m}/${d}.json`;
        
        const fileBuffer = fs.readFileSync(tempFilePath);
        const { error: uploadError } = await supabase.storage
            .from('observations-archives')
            .upload(filePath, fileBuffer, { contentType: 'application/json', upsert: true });

        if (uploadError) {
            fs.unlinkSync(tempFilePath);
            throw uploadError;
        }

        console.log(`   -> Fichier sauvegardé. Suppression SQL progressive...`);
        
        // Suppression par tranches de 2h
        for (let hour = 0; hour < 24; hour += 2) {
            const hStart = `${hour.toString().padStart(2, '0')}:00:00Z`;
            const hEnd = `${(hour + 2).toString().padStart(2, '0')}:00:00Z`;
            
            const { error: deleteError } = await supabase
                .from('observations_6mn')
                .delete()
                .gte('timestamp', `${targetDate}T${hStart}`)
                .lt('timestamp', `${targetDate}T${hEnd}`);
                
            if (deleteError) {
                console.error(`      ❌ Erreur suppression tranche ${hStart}-${hEnd}`);
                fs.unlinkSync(tempFilePath);
                throw deleteError;
            }
        }
        console.log(`   -> Journée ${targetDate} archivée et nettoyée.`);
    } else {
        console.log(`   -> Aucune donnée pour le ${targetDate}.`);
    }

    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
}

runCronArchive();
