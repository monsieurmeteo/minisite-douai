
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

async function checkLilleMin() {
    const stationId = '59343001';
    let output = "";

    // TODAY (15th) - Local Day (UTC+1)
    const { data: minToday } = await supabase.from('observations_6mn')
        .select('t, timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-14T23:00:00') // 15th 00h00 Local
        .lt('timestamp', '2026-02-15T23:00:00')
        .order('t', { ascending: true })
        .limit(1);

    output += `Lille Min Today (Local 15th): ${minToday[0]?.t} at ${minToday[0]?.timestamp}\n`;

    // YESTERDAY (14th) - Local Day (UTC+1)
    const { data: minYesterday } = await supabase.from('observations_6mn')
        .select('t, timestamp')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-02-13T23:00:00') // 14th 00h00 Local
        .lt('timestamp', '2026-02-14T23:00:00')
        .order('t', { ascending: true })
        .limit(1);

    output += `Lille Min Yesterday (Local 14th): ${minYesterday[0]?.t} at ${minYesterday[0]?.timestamp}\n`;

    fs.writeFileSync('lille_min.txt', output);
}

checkLilleMin();
