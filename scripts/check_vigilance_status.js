import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Config locale
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("Missing Supabase config in .env.local");
    process.exit(1);
}

const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_KEY = keyMatch[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkVigilance() {
    console.log("Checking vigilance data in Supabase...");

    const { data, error } = await supabase
        .from('vigilance_status')
        .select('last_update')
        .order('last_update', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching vigilance data:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Last vigilance update:", data[0].last_update);
        const lastUpdate = new Date(data[0].last_update);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastUpdate) / 1000 / 60);
        console.log(`Data is ${diffMinutes} minutes old.`);
    } else {
        console.log("No vigilance data found in table 'vigilance_status'.");
    }

    const { count, error: countError } = await supabase
        .from('vigilance_bulletins')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error fetching bulletins count:", countError);
    } else {
        console.log("Number of bulletins in DB:", count);
    }
}

checkVigilance();
