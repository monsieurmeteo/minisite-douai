
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLille() {
    const today = '2026-02-15';
    const stationId = '59343001';

    console.log(`Checking Lille Lesquin (${stationId}) for ${today} DETAILED...`);

    // Check 00:00 UTC to 01:30 UTC. 
    // 01:42 Local = 00:42 UTC.

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
        const ts = new Date(obs.timestamp);
        const hours = ts.getUTCHours();
        const mins = ts.getUTCMinutes();
        const localH = (hours + 1) % 24; // UTC+1

        // Format nicer
        const localTime = `${localH}:${mins < 10 ? '0' + mins : mins}`;
        const utcTime = `${hours}:${mins < 10 ? '0' + mins : mins}`;

        console.log(`[UTC ${utcTime} | Local ${localTime}] T=${obs.t}°C`);
        if (obs.min_t !== undefined && obs.min_t !== null) console.log(`   -> min_t_6mn=${obs.min_t}`);
    });
}

checkLille();
