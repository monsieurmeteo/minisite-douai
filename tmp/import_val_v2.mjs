import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function importValenciennes() {
    console.log('--- 🚀 IMPORT VALENCIENNES HORAIRE (Corrected Format) ---');
    try {
        const content = fs.readFileSync('données valenciennes.csv', 'utf8');
        const lines = content.split('\n').filter(l => l.trim() !== '');

        const dataRows = lines.slice(1);
        const toInsert = [];

        for (const line of dataRows) {
            const [id, dateStr, rr, tn, tx, fxi] = line.split(';');
            if (!id || !dateStr || id.length < 5) continue;

            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            const h = dateStr.substring(8, 10);

            // Important: Use explicit +00:00 as seen in previous DB reads to avoid ghosting
            const isoTimestamp = `${y}-${m}-${d}T${h}:00:00+00:00`;

            const tVal = tx ? parseFloat(tx.replace(',', '.')) : (tn ? parseFloat(tn.replace(',', '.')) : null);
            const rrVal = rr ? parseFloat(rr.replace(',', '.')) : 0;
            const fxiVal = fxi ? parseFloat(fxi.replace(',', '.')) : null;

            toInsert.push({
                station_id: id,
                timestamp: isoTimestamp,
                t: tVal,
                rr1: rrVal,
                fxi: fxiVal,
                updated_at: new Date().toISOString()
            });
        }

        console.log(`📡 Clean records: ${toInsert.length}. Uploading...`);

        // Use a single batch for 673 records to ensure consistency
        const { error, data } = await supabase.from('observations_horaire').upsert(toInsert, {
            onConflict: 'station_id, timestamp'
        }).select('id');

        if (error) {
            console.error(`❌ DB Error:`, error.message);
        } else {
            console.log(`✅ Success: ${data.length} records processed in Supabase.`);
        }

        console.log('--- ✨ IMPORT COMPLETE ---');
    } catch (e) {
        console.error('❌ FATAL ERROR:', e.message);
    }
}

importValenciennes();
