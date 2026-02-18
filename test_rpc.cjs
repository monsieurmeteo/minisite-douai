
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const content = fs.readFileSync(path.resolve('.env.local'), 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });
        return env;
    } catch { return {}; }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testRPC() {
    console.log("🧪 TEST RPC get_daily_extremes_full");

    // Essai avec le 19 (Hier)
    const dateTest = '2026-01-19';
    console.log(`📅 Appel RPC pour ${dateTest}...`);

    const { data, error } = await supabase.rpc('get_daily_extremes_full', { target_date: dateTest });

    if (error) {
        console.error("❌ RPC Error:", error);
    } else {
        console.log(`✅ Résultat RPC: ${data.length} lignes.`);
        const stationWithRain = data.find(s => s.rain_total > 0);
        if (stationWithRain) {
            console.log("📍 Station avec pluie trouvée:", stationWithRain);
        } else {
            console.log("⚠️ Aucune station avec pluie (rain_total > 0) trouvée pour cette date.");
            if (data.length > 0) console.log("Exemple de première station:", data[0]);
        }
    }
}

testRPC();
