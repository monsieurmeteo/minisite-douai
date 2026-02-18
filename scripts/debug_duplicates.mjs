
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const res = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVolume() {
    const today = new Date().toISOString().split('T')[0];
    const stationId = '59343001'; // Lille

    console.log(`Checking volume for Lille (${stationId}) on ${today}...`);

    // Count exact 
    const { count, error } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

    console.log(`Count for Lille today: ${count}`);
    if (error) console.error("Error:", error);

    // Fetch distinct
    const { data: data2 } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

    if (data2) {
        // Unique timestamps
        const distinct = new Set(data2.map(d => d.timestamp)).size;
        console.log(`Distinct timestamps: ${distinct} vs Total Rows: ${data2.length}`);
    }
}

checkVolume();
