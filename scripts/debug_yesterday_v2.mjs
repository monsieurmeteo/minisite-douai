
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndRefresh() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const targetDate = d.toISOString().split('T')[0];

    console.log(`Checking daily_summaries for date: ${targetDate}`);

    // Check if summaries exist
    const { count, error: countError } = await supabase
        .from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('date', targetDate);

    if (countError) {
        console.error("Error checking daily_summaries:", countError);
    } else {
        console.log(`Found ${count} records in daily_summaries.`);
    }

    if (count === 0) {
        console.log("Refreshing daily summaries...");
        const { data: refreshData, error: refreshError } = await supabase
            .rpc('refresh_daily_summaries', { target_date: targetDate });

        if (refreshError) {
            console.error("Error refreshing summaries:", refreshError);
        } else {
            console.log(`Refreshed ${refreshData} stations.`);
        }
    }

    // Now check data for Lille
    const { data: lille, error: lilleError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('date', targetDate)
        .eq('station_id', '59343001'); // Lille

    if (lilleError) console.error("Lille fetch error:", lilleError);
    else console.log("Lille Data:", lille);

    // Check if we can use get_daily_extremes_fast
    const { data: fastData, error: fastError } = await supabase
        .rpc('get_daily_extremes_fast', { target_date: targetDate });

    if (fastError) console.error("get_daily_extremes_fast error:", fastError);
    else console.log(`get_daily_extremes_fast returned ${fastData.length} records.`);
}

checkAndRefresh();
