
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkStation() {
    const stationId = '01143002'; // Divonne-les-Bains
    console.log(`🔍 Vérification DB pour station ${stationId}...`);

    const { data: countData, count, error } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact' })
        .eq('station_id', stationId);

    if (error) {
        console.error("❌ Erreur :", error.message);
    } else {
        console.log(`✅ Nombre d'enregistrements pour ${stationId} : ${count}`);
        if (count > 0) console.table(countData);
    }

    // Check total count again
    const { count: total } = await supabase.from('observations_6mn').select('*', { count: 'exact', head: true });
    console.log(`\n📊 Total dans la table : ${total}`);
}

checkStation();
