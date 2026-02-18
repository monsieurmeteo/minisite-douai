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
// IMPORTANT: Use ANON key to simulate a public visitor
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Credentials missing.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function testPublicAccess() {
    console.log("🕵️ Testing Public Read Access (Anon Key)...");

    // 1. Test reading stations
    const { data: stations, error: errStations } = await supabase
        .from('stations')
        .select('id')
        .limit(5);

    if (errStations) {
        console.error("❌ Stations Read Failed:", errStations.message);
    } else if (!stations || stations.length === 0) {
        console.error("⚠️ Stations table empty or access denied (RLS).");
    } else {
        console.log(`✅ Stations Read OK (${stations.length} found).`);
    }

    // 2. Test reading observations
    const { data: obs, error: errObs } = await supabase
        .from('observations_6mn')
        .select('station_id, t')
        .limit(5);

    if (errObs) {
        console.error("❌ Observations Read Failed:", errObs.message);
    } else if (!obs || obs.length === 0) {
        console.error("⚠️ Observations table empty or access denied (RLS).");
    } else {
        console.log(`✅ Observations Read OK (${obs.length} found). Sample T=${obs[0].t}°C`);
    }
}

testPublicAccess();
