
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

const CITIES = [
    { name: "Lille", id: "59343001" },
    { name: "Paris", id: "75114001" },
    { name: "Lyon", id: "69029001" },
    { name: "Marseille", id: "13054001" },
    { name: "Valenciennes", id: "59606004" } // Added for check
];

async function checkData() {
    console.log("Checking data availability for 30 Cities...");

    // Dates
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    console.log(`Today: ${today}, Yesterday: ${yesterday}`);

    const ids = CITIES.map(c => c.id);

    // Check Yesterday
    const { count: countY, error: errY } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .in('station_id', ids)
        .gte('timestamp', `${yesterday}T00:00:00`)
        .lt('timestamp', `${yesterday}T23:59:59`);

    console.log(`Yesterday (${yesterday}) Records for sample cities: ${countY} (Error: ${errY?.message || 'None'})`);

    // Check Today
    const { count: countT, error: errT } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .in('station_id', ids)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

    console.log(`Today (${today}) Records for sample cities: ${countT} (Error: ${errT?.message || 'None'})`);

    // Detail for Valenciennes (Why -4.3?)
    const { data: valData } = await supabase
        .from('observations_6mn')
        .select('timestamp, t, min_t')
        .eq('station_id', '59606004')
        .gte('timestamp', `${today}T00:00:00`)
        .order('t', { ascending: true })
        .limit(5);

    console.log("Valenciennes Lowest T today:", valData);
}

checkData();
