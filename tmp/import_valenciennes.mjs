import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function importValenciennes() {
    console.log('--- 🚀 IMPORT VALENCIENNES HORARY ---');
    try {
        const content = fs.readFileSync('données valenciennes.csv', 'utf8');
        const lines = content.split('\n').filter(l => l.trim() !== '');

        // Skip header
        const dataRows = lines.slice(1);
        const toInsert = [];

        for (const line of dataRows) {
            const [id, dateStr, rr, tn, tx, fxi] = line.split(';');
            if (!id || !dateStr) continue;

            // Date format: 2026020100 -> 2026-02-01T00:00:00Z
            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            const h = dateStr.substring(8, 10);
            const isoTimestamp = `${y}-${m}-${d}T${h}:00:00Z`;

            toInsert.push({
                station_id: id,
                timestamp: isoTimestamp,
                t: tx ? parseFloat(tx.replace(',', '.')) : (tn ? parseFloat(tn.replace(',', '.')) : null),
                rr1: rr ? parseFloat(rr.replace(',', '.')) : 0,
                fxi: fxi ? parseFloat(fxi.replace(',', '.')) : null,
                updated_at: new Date().toISOString()
            });
        }

        console.log(`📡 Prepared ${toInsert.length} records. Uploading...`);

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize);
            const { error } = await supabase.from('observations_horaire').upsert(batch, {
                onConflict: 'station_id, timestamp'
            });
            if (error) {
                console.error(`❌ Batch error at ${i}:`, error.message);
            } else {
                process.stdout.write(`✅ Batch ${i / batchSize + 1} uploaded\r`);
            }
        }

        console.log('\n--- ✨ IMPORT COMPLETE ---');
    } catch (e) {
        console.error('❌ FATAL ERROR:', e.message);
    }
}

importValenciennes();
