import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkDailyFuture() {
    console.log("--- Checking future records in daily_summaries ---");

    // Future date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Checking dates >= ${tomorrowStr}`);

    // Get count of future summaries
    const { count, error } = await supabase.from('daily_summaries').select('*', { count: 'exact', head: true }).gte('date', tomorrowStr);
    console.log("Future summaries count:", count, error || "");

    if (count && count > 0) {
        console.log("Deleting future summaries...");
        const { count: delCount, error: delErr } = await supabase.from('daily_summaries').delete().gte('date', tomorrowStr);
        console.log("Deleted count:", delCount, delErr || "");
    }
}

checkDailyFuture();
