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

    console.log(`Fixing DAILY SUMMARIES for Douai (${stationId}) on ${date}...`);

    // The table uses composite PK (station_id, date)
    const { data } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date);

    if (data && data.length > 0) {
        const rec = data[0];
        console.log("Current Record:", rec);

        let updates = {};
        let changed = false;

        // Force reset bad values
        if (rec.temp_max >= 14) {
            updates.temp_max = 10.1; // Manually detected real max from logs earlier
            changed = true;
        }
        if (rec.wind_gust_max >= 100) {
            updates.wind_gust_max = null; // No gust record > 150 valid
            changed = true;
        }

        if (changed) {
            console.log("Applying updates:", updates);
            const { error: errUp } = await supabase
                .from('daily_summaries')
                .update(updates)
                .match({ station_id: stationId, date: date }); // Use match for composite key if needed or eq chaining

            if (errUp) console.error("Update failed:", errUp);
            else {
                console.log("✅ Daily Summary Corrected successfully.");
                // Also try to recalculate automatically if function exists
                const { error: rpcErr } = await supabase.rpc('refresh_daily_summaries');
                if (!rpcErr) console.log("🔄 Triggered global refresh to be sure.");
            }
        } else {
            console.log("Record looks fine already.");
        }
    }
}

checkDailySummaries();
