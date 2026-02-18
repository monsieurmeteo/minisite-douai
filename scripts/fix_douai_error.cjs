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

async function correctData() {
    const stationId = '59178001';
    console.log(`Checking range for ${stationId} (Douai)...`);

    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-01-21T00:00:00+00:00')
        .lte('timestamp', '2026-01-21T03:00:00+00:00')
        .order('timestamp');

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} records.`);
        let found = false;

        for (const rec of data) {
            // Display for debug
            console.log(`Time: ${rec.timestamp} | Gust: ${rec.fxi} | Rain: ${rec.rr_per}`);

            // Check specifically for the error described: 150km/h or 15mm
            if (rec.fxi >= 140 || rec.rr_per >= 14) {
                console.log("--> 🚨 FOUND BAD RECORD! Updating...");

                const { error: err2 } = await supabase
                    .from('observations_6mn')
                    .update({ fxi: null, rr_per: 0 })
                    .eq('id', rec.id);

                if (err2) console.error(err2);
                else console.log("✅ Fixed successfully.");
                found = true;
            }
        }

        if (!found) console.log("No matching bad record found in this range.");

    } else {
        console.log("No record found in range.");
    }
}

correctData();
