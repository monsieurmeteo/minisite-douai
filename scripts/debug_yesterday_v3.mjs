
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

async function check() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const targetDate = d.toISOString().split('T')[0];

    console.log(`Checking J-1 (${targetDate})...`);

    // 1. Check refresh_daily_summaries existence
    try {
        const { error } = await supabase.rpc('refresh_daily_summaries', { target_date: targetDate });
        if (error) {
            console.log("refresh_daily_summaries ERROR:", error.message);
        } else {
            console.log("refresh_daily_summaries OK (executed)");
        }
    } catch (e) {
        console.log("Exception calling refresh:", e.message);
    }

    // 2. Fetch data via get_daily_extremes_fast
    const { data: fastData, error: fastError } = await supabase
        .rpc('get_daily_extremes_fast', { target_date: targetDate });

    if (fastError) {
        console.log("get_daily_extremes_fast ERROR:", fastError.message);
    } else {
        console.log(`get_daily_extremes_fast returned ${fastData.length} records.`);
        const lille = fastData.find(s => s.station_id === '59343001');
        if (lille) {
            console.log("Lille (59343001) Data:", JSON.stringify(lille, null, 2));
        } else {
            console.log("Lille not found in fast data.");
        }
    }
}

check();
