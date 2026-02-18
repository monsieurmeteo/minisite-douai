
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    console.log("🚀 Démarrage de l'importation de la climatologie locale vers Supabase...");

    if (!fs.existsSync('src/data/all_stations_records.json')) {
        console.error("❌ Fichier src/data/all_stations_records.json introuvable.");
        return;
    }

    const records = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
    const ids = Object.keys(records);
    console.log(`📊 ${ids.length} stations trouvées localement.`);

    const CHUNK = 100;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunkIds = ids.slice(i, i + CHUNK);
        const rows = chunkIds.map(id => ({
            station_id: id,
            name: records[id].name,
            data: records[id],
            last_update: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('station_climatology')
            .upsert(rows, { onConflict: 'station_id' });

        if (error) {
            console.error(`  [!] Erreur chunk ${i}:`, error.message);
            errors++;
        } else {
            success += rows.length;
            process.stdout.write('.');
        }
    }

    console.log(`\n\n✅ Terminé !`);
    console.log(`- Stations importées/mises à jour : ${success}`);
    console.log(`- Chunks en erreur : ${errors}`);
}

run();
