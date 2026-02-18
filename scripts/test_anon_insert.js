
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) process.exit(1);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testInsert() {
    console.log("TEST: Tentative d'insertion avec clé ANON (Simulation Site Web)...");

    const { error } = await supabase
        .from('observations_6mn')
        .insert([{
            station_id: 'TEST_INSERT_BROWSER',
            timestamp: new Date().toISOString(),
            t: 12.5
        }]);

    if (error) {
        console.error("❌ ECHEC INSERTION (Attendu si RLS actif):", error.message);
        console.log("👉 Le site web NE PEUT PAS archiver directement sans modification des droits.");
    } else {
        console.log("✅ SUCCES INSERTION ! La RLS autorise l'écriture publique.");

        // Nettoyage
        await supabase.from('observations_6mn').delete().eq('station_id', 'TEST_INSERT_BROWSER');
    }
}

testInsert();
