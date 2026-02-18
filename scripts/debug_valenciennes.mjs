
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

async function checkValenciennes() {
    const today = new Date().toISOString().split('T')[0];
    const stationId = '59606004';

    console.log(`Checking Valenciennes (${stationId}) for ${today}...`);

    // Fetch observations from 01:00 to 03:00 UTC (or local? MF API is UTC usually, but let's grab a wide range)
    // Actually, user said 1h42. It could be local time (UTC+1 currently). 
    // If it's 1h42 local, it's 00h42 UTC.
    // Let's grab 00:00 to 04:00 UTC just to be sure.

    // We want all columns to see what's available (t, min_t, etc)
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T05:00:00`)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data.length} records.`);

    data.forEach(obs => {
        const date = new Date(obs.timestamp);
        // Display in local time (UTC+1 roughly)
        const localTime = date.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

        console.log(`[${obs.timestamp} | ${localTime}] T=${obs.t}°C, Min1h=${obs.min_t ?? '-'}, Max1h=${obs.max_t ?? '-'}`);
    });
}

checkValenciennes();
