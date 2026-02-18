
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (result.error) {
    console.error("Error loading .env.local:", result.error);
}

// Check keys
const viteKeys = Object.keys(process.env).filter(k => k.startsWith('VITE_'));
console.log("Loaded VITE keys:", viteKeys);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials (URL/KEY empty)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const targetDate = d.toISOString().split('T')[0];

    console.log(`Checking data for date: ${targetDate}`);

    const { data, error } = await supabase.rpc('get_daily_extremes_full', { target_date: targetDate });

    if (error) {
        console.error("RPC Error:", error);
    } else if (!data || data.length === 0) {
        console.log("No data found for yesterday.");
    } else {
        console.log(`Found ${data.length} records.`);
        const lille = data.find(s => s.station_id === '59343001');
        if (lille) {
            console.log("Lille (59343001) Yesterday:", lille);
        } else {
            console.log("Lille not found in yesterday's data.");
        }
    }

    // Also check raw count in observations_6mn for that day
    const { count, error: countError } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', `${targetDate}T00:00:00`)
        .lt('timestamp', `${targetDate}T23:59:59`);

    if (countError) console.error("Count Error:", countError);
    else console.log(`Raw observations count for ${targetDate}: ${count}`);
}

checkYesterday();
