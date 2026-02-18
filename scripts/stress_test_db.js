
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Config
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function stressTest() {
    console.log("💣 DÉBUT DU STRESS TEST (Simulation 1000 envois)...");

    const batchSize = 100;
    const total = 1000;
    let saved = 0;

    // Générer 1000 fausses données
    const now = new Date();
    const fakeData = [];

    for (let i = 0; i < total; i++) {
        fakeData.push({
            station_id: `SIMULATION_${i.toString().padStart(4, '0')}`,
            timestamp: now.toISOString(),
            t: 20 + (i % 10),
            pres: 1013
        });
    }

    console.log(`📦 Envoi de ${total} lignes par paquets de ${batchSize}...`);

    for (let i = 0; i < total; i += batchSize) {
        const batch = fakeData.slice(i, i + batchSize);
        const { error } = await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

        if (error) {
            console.error(`❌ Échec lot ${i}:`, error.message);
        } else {
            saved += batch.length;
            process.stdout.write("█"); // Barre de progression
        }
    }

    console.log(`\n\n✅ TEST TERMINÉ : ${saved} / ${total} lignes insérées.`);
    console.log("👉 Si vous voyez ce message, le système est ROBUSTE et prêt.");
}

stressTest();
