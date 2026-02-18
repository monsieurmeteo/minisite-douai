
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Charge config
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function forceInsert() {
    console.log("🛠️ TEST FORCE INSERTION (Simulation Point n°2)...");

    // On simule une donnée pour la station "TEST_FORCE" à une heure différente
    const fakeData = {
        station_id: 'TEST_FORCE_002',
        timestamp: new Date().toISOString(),
        t: 25.5, // Il fait chaud dans le test
        pres: 1015
    };

    const { error } = await supabase.from('observations_6mn').insert([fakeData]);

    if (error) {
        console.error("❌ ECHEC INSERTION :", error.message);
    } else {
        console.log("✅ SUCCÈS INSERTION ! Supabase accepte les nouvelles données.");
    }
}

forceInsert();
