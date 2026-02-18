const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
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

async function deepCheck() {
    console.log("🔍 DIAGNOSTIC APPROFONDI");
    console.log("========================\n");

    // Test 1: Appel RPC sans limite
    console.log("Test 1: RPC sans limite explicite");
    const { data: d1, error: e1 } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-20' });
    console.log(`   Résultat: ${d1?.length || 0} stations`);
    if (e1) console.log(`   Erreur: ${e1.message}`);

    // Test 2: Appel RPC avec limit(3000)
    console.log("\nTest 2: RPC avec .limit(3000)");
    const { data: d2, error: e2 } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-20' })
        .limit(3000);
    console.log(`   Résultat: ${d2?.length || 0} stations`);
    if (e2) console.log(`   Erreur: ${e2.message}`);

    // Test 3: Chercher Douai dans les résultats
    if (d2 && d2.length > 0) {
        const douai = d2.find(s => s.station_id === '59178001');
        console.log(`\n🎯 Douai dans les résultats: ${douai ? 'OUI ✅' : 'NON ❌'}`);

        if (!douai) {
            // Lister les stations du Nord
            const nord = d2.filter(s => s.station_id.startsWith('59'));
            console.log(`\nStations du Nord (59) trouvées: ${nord.length}`);
            nord.slice(0, 10).forEach(s => console.log(`   - ${s.station_id}`));
        } else {
            console.log(`   Temp Min: ${douai.temp_min}°C`);
            console.log(`   Temp Max: ${douai.temp_max}°C`);
        }
    }

    // Test 4: Vérifier directement dans observations_6mn
    console.log("\n📊 Vérification directe dans observations_6mn:");
    const { data: douai6mn, count } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact' })
        .eq('station_id', '59178001')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z');

    console.log(`   Douai a ${count || 0} relevés pour le 20/01`);
    if (douai6mn && douai6mn.length > 0) {
        console.log(`   Premier relevé: ${douai6mn[0].timestamp} | T: ${douai6mn[0].t}°C`);
        console.log(`   Dernier relevé: ${douai6mn[douai6mn.length - 1].timestamp} | T: ${douai6mn[douai6mn.length - 1].t}°C`);
    }
}

deepCheck();
