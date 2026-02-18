
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function inspectData() {
    console.log("🔍 INSPECTION DES DONNÉES SUPABASE (6mn)...");

    // Récupérer les 10 dernières lignes
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .limit(10); // Suppression de order pour voir n'importe quoi

    if (error) {
        console.error("❌ Erreur lecture :", error.message);
    } else {
        console.log(`✅ ${data.length} enregistrements trouvés.`);
        console.table(data);

        if (data.length > 0) {
            console.log("\n🕵️ ANALYSE ID :");
            console.log("Exemple d'ID stocké :", data[0].station_id);
            console.log("Timestamp :", data[0].timestamp);
        }
    }
}

inspectData();
