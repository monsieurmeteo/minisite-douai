const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                env[key] = val;
            }
        }
    });
    return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkDailySummaries() {
    const stationId = '59178001';
    const date = '2026-01-21';

    console.log(`Checking DAILY SUMMARIES for Douai (${stationId}) on ${date}...`);

    // Try to fetch from 'daily_summaries' table
    const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date);

    if (error) {
        console.error("Error fetching daily_summaries:", error.message);
        return;
    }

    if (data && data.length > 0) {
        const rec = data[0];
        console.log("Found Summary Record:", rec);

        let needsUpdate = false;
        let updates = {};

        // Check Max Temp (t_max)
        if (rec.t_max >= 14) {
            console.log(`🚨 Bad Max Temp detected: ${rec.t_max}°C. Resetting...`);
            updates.t_max = null; // or calculate real max if possible, but null/delete safer for quick fix
            needsUpdate = true;
        }

        // Check Max Gust (fxi_max or similar)
        // Note: Field names might vary (max_wind, gust_max, etc). 
        // Based on common naming: fxi_max, or wind_gust_max. 
        // Let's assume standard names or inspect the object printed above first if script fails, 
        // but for now I'll try generic names or just look at the output first.

        // Actually, to be safe, I'll print keys first in output, then decide.
        // But to be proactive, I will try to detect '150'

        for (const [k, v] of Object.entries(rec)) {
            if (v === 150 && (k.includes('wind') || k.includes('fxi') || k.includes('gust'))) {
                console.log(`🚨 Bad Gust detected in field '${k}': ${v}. Resetting...`);
                updates[k] = null;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            const { error: errUp } = await supabase
                .from('daily_summaries')
                .update(updates)
                .eq('id', rec.id);

            if (errUp) console.error("Update failed:", errUp);
            else console.log("✅ Daily Summary Corrected.");

            // Trigger refresh if possible?
            // console.log("Attempting to run refresh_daily_summaries...");
            // await supabase.rpc('refresh_daily_summaries', { date_input: date }); 
        } else {
            console.log("No obvious bad values found in summary (or fields named differently).");
        }

    } else {
        console.log("No summary record found for this date.");
    }
}

checkDailySummaries();
