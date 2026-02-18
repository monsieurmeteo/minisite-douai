
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const res = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (res.error) {
    console.error("Error loading env:", res.error);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLille() {
    // Current date: 2026-02-15
    const today = '2026-02-15';
    const stationId = '59343001'; // Lille Lesquin

    console.log(`Checking Lille Lesquin (${stationId}) for ${today}...`);

    // Check data around 01:42 Local => 00:42 UTC
    // We fetch 00:00 to 02:00 UTC

    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T02:00:00`)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data.length} records.`);

    data.forEach(obs => {
        // Simple manual conversion if needed
        const ts = new Date(obs.timestamp);
        const hours = ts.getUTCHours();
        const mins = ts.getUTCMinutes();
        // Lille is UTC+1 in winter
        const localH = (hours + 1) % 24;

        console.log(`[UTC ${hours}:${mins} | Local ~${localH}:${mins}] T=${obs.t}°C`);

        // Check if there is a 'min_t' field that might be carrying the 6mn min
        if (obs.min_t !== undefined) console.log(`   -> min_t=${obs.min_t}`);
    });
}

checkLille();
