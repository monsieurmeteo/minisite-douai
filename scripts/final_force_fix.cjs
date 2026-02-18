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

async function finalForceFix() {
    const stationId = '59178001';
    const date = '2026-01-21';

    console.log(`🔨 FORCE FIXING daily summary for Douai (${stationId}) on ${date}...`);

    // 1. Check raw observations again
    const { data: rawObs } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', `${date}T00:00:00`)
        .lte('timestamp', `${date}T23:59:59`)
        .gt('t', 13); // Look for anything > 13 degrees

    if (rawObs && rawObs.length > 0) {
        console.log("🚨 FOUND GHOST RAW DATA! This explains why it comes back.");
        console.table(rawObs);
        // Delete them
        for (const obs of rawObs) {
            await supabase.from('observations_6mn').delete().eq('id', obs.id);
            console.log(`Deleted ghost observation ${obs.id}`);
        }
    } else {
        console.log("✅ Raw observations are clean (no temp > 13°C).");
    }

    // 2. Update Summary HARD
    const updates = {
        temp_max: 10.1,
        wind_gust_max: 0,
        updated_at: new Date().toISOString()
    };

    console.log("Applying update to daily_summaries:", updates);
    const { data: updatedData, error: upErr } = await supabase
        .from('daily_summaries')
        .update(updates)
        .eq('station_id', stationId)
        .eq('date', date)
        .select();

    if (upErr) {
        console.error("❌ Update failed:", upErr);
    } else {
        console.log("✅ Update success. Result:", updatedData);
    }
}

finalForceFix();
