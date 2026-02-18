
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLilleSpecific() {
    const stationId = '59343001';
    let output = "";

    // Today 00:30-01:00 UTC (01:30-02:00 Local)
    const { data: d1 } = await supabase.from('observations_6mn')
        .select('timestamp, t')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-15T00:30:00')
        .lt('timestamp', '2026-02-15T01:00:00')
        .order('timestamp', { ascending: true });

    output += "TODAY (UTC 00:xx -> Local 01:xx):\n";
    if (d1) d1.forEach(r => output += `${r.timestamp} => ${r.t}\n`);

    // Yesterday 22:15-22:45 UTC (23:15-23:45 Local)
    const { data: d2 } = await supabase.from('observations_6mn')
        .select('timestamp, t')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-14T22:15:00')
        .lt('timestamp', '2026-02-14T22:45:00')
        .order('timestamp', { ascending: true });

    output += "\nYESTERDAY (UTC 22:xx -> Local 23:xx):\n";
    if (d2) d2.forEach(r => output += `${r.timestamp} => ${r.t}\n`);

    fs.writeFileSync('lille_data.txt', output);
    console.log("Done.");
}

checkLilleSpecific();
