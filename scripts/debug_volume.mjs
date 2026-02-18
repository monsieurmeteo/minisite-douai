
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVolume() {
    const today = new Date().toISOString().split('T')[0];
    const stationId = '59343001'; // Lille

    console.log(`Checking volume for Lille (${stationId}) on ${today}...`);

    // Count exact rows
    const { count, error } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

    console.log(`Count for Lille today: ${count}`);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Fetch first 10 rows to see if duplicates
    const { data } = await supabase
        .from('observations_6mn')
        .select('timestamp, t')
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .order('timestamp', { ascending: true })
        .limit(20);

    console.log("Sample rows:");
    console.table(data);
}

checkVolume();
