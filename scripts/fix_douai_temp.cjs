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

async function correctTemp() {
    const stationId = '59178001';
    console.log(`Checking range for ${stationId} (Douai) to fix Temperature...`);

    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', '2026-01-21T00:00:00+00:00')
        .lte('timestamp', '2026-01-21T03:00:00+00:00')
        .order('timestamp');

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        let found = false;

        for (const rec of data) {
            // Check specifically for T around 15°C (which is abnormal for Jan 21st, usually < 10°C)
            if (rec.t >= 14) {
                console.log(`--> 🚨 FOUND BAD TEMP: ${rec.t}°C at ${rec.timestamp}. Updating...`);

                const { error: err2 } = await supabase
                    .from('observations_6mn')
                    .update({ t: null }) // Set temp to null
                    .eq('id', rec.id);

                if (err2) console.error(err2);
                else console.log("✅ Fixed temp successfully.");
                found = true;
            }
        }

        if (!found) console.log("No abnormal temperature found in this range.");

    } else {
        console.log("No record found in range.");
    }
}

correctTemp();
