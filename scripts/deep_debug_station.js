
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Config
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const TARGET_STATION = '01143002'; // Divonne-les-Bains

async function debugStation() {
    console.log(`🔍 DIAGNOSTIC APPROFONDI POUR LA STATION : ${TARGET_STATION}`);

    // 1. Vérifier Table HORAIRE
    const { data: horaire, error: errH } = await supabase
        .from('observations_horaire')
        .select('*')
        .eq('station_id', TARGET_STATION)
        .order('timestamp', { ascending: false });

    console.log(`\n--- TABLE HORAIRE (observations_horaire) ---`);
    if (errH) console.error("❌ Erreur SELECT:", errH);
    else {
        console.log(`📊 Nombre de relevés trouvés : ${horaire.length}`);
        if (horaire.length > 0) {
            console.log("🕒 Derniers relevés :", horaire.slice(0, 3).map(r => `${r.timestamp} | T=${r.t}°C`));
        } else {
            console.log("⚠️ AUCUNE donnée horaire pour cette station.");
        }
    }

    // 2. Vérifier Table 6 MIN
    const { data: sixMin, error: err6 } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', TARGET_STATION)
        .order('timestamp', { ascending: false });

    console.log(`\n--- TABLE 6 MINUTES (observations_6mn) ---`);
    if (err6) console.error("❌ Erreur SELECT:", err6);
    else {
        console.log(`📊 Nombre de relevés trouvés : ${sixMin.length}`);
        if (sixMin.length > 0) {
            console.log("⏱️ Derniers relevés :", sixMin.slice(0, 3).map(r => `${r.timestamp} | T=${r.t}°C`));
        } else {
            console.log("⚠️ AUCUNE donnée 6min pour cette station.");
        }
    }
}

debugStation();
