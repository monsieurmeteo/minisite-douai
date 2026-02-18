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
// Need service role key to bypass RLS potentially, but usually anon works if policies are set.
// If anon fails, we might need a stronger key or use the defined RPCs if possible.
// But DELETE on daily_summaries might be restricted.

if (!url || !key) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function purgeAndRegenerateDouai() {
    const stationId = '59178001';
    const date = '2026-01-21';

    console.log(`🧹 PURGING daily summary for Douai (${stationId}) on ${date}...`);

    // 1. DELETE the corrupted summary row entirely
    const { error: delErr } = await supabase
        .from('daily_summaries')
        .delete()
        .eq('station_id', stationId)
        .eq('date', date);

    if (delErr) {
        console.error("❌ Delete failed:", delErr.message);
        // If DELETE is blocked by RLS, we might need to use a direct SQL UPDATE to nullify it first or another path.
        // Or assume the script runs with enough privileges (local node script usually uses anon key which has policy).
        // Let's check policies in DAILY_SUMMARIES_SOLUTION.sql:
        // GRANT SELECT, INSERT, UPDATE ON daily_summaries TO anon...
        // DELETE is NOT granted! Ah!

        console.log("ℹ️ DELETE not granted? Trying UPDATE to force reset.");
        // If DELETE fails, we manually forcing values to NULL/Low to trick the refresh?
        // No, refresh uses GREATEST. 
        // We MUST update to NULL first. GREATEST(NULL, x) -> x usually? Or NULL?
        // In SQL: GREATEST(10, NULL) -> 10. 
        // So if I set to NULL, then refresh runs, it will pick up the value from observations.

        const { error: upErr } = await supabase
            .from('daily_summaries')
            .update({
                temp_max: -999, // artificial low
                wind_gust_max: 0,
                temp_min: 999
            })
            .eq('station_id', stationId)
            .eq('date', date);

        if (upErr) console.error("Update fallback failed:", upErr);
        else console.log("✅ Row reset to base values.");

    } else {
        console.log("✅ Row deleted.");
    }

    // 2. TRIGGER REFRESH to regenerate from clean 6mn data
    console.log("🔄 Regenerating summary from clean observations...");
    const { data: rpcData, error: rpcErr } = await supabase
        .rpc('refresh_daily_summaries', { target_date: date });

    if (rpcErr) {
        console.error("❌ Refresh failed:", rpcErr.message);
    } else {
        console.log(`✅ Refresh complete. Updated rows: ${rpcData}`);
    }

    // 3. VERIFY
    const { data } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date);

    if (data && data.length > 0) {
        console.log("🔍 NEW Summary Record:", data[0]);
    }
}

purgeAndRegenerateDouai();
