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

async function checkHourlyTable() {
    const stationId = '59178001';
    console.log(`Checking HOURLY table for Douai (${stationId}) on 2026-01-21...`);

    // Fetch all records for the day in OBSERVATIONS_HORAIRE
    const { data, error } = await supabase
        .from('observations_horaire')
        .select('id, timestamp, t')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-01-21T00:00:00+00:00')
        .lte('timestamp', '2026-01-21T23:59:59+00:00')
        .order('t', { ascending: false });

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} hourly records.`);
        console.log("Top 5 hottest hourly records:");
        data.slice(0, 5).forEach(r => console.log(`  ${r.timestamp} -> ${r.t}°C`));

        // Auto-fix if we see anything >= 14
        const badRecords = data.filter(r => r.t >= 14);
        if (badRecords.length > 0) {
            console.log(`\n🚨 Found ${badRecords.length} bad hourly records! Cleaning...`);
            for (const rec of badRecords) {
                const { error: errFix } = await supabase
                    .from('observations_horaire')
                    .update({ t: null })
                    .eq('id', rec.id);
                if (errFix) console.error(`Failed to fix ${rec.id}:`, errFix);
                else console.log(`  ✅ Fixed hourly record ${rec.timestamp} (was ${rec.t}°C)`);
            }
        } else {
            console.log("\n✅ No temperatures >= 14°C found in HOURLY table.");
        }
    } else {
        console.log("No hourly records found for Douai today.");
    }
}

checkHourlyTable();
