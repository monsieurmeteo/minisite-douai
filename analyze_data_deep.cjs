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

async function analyzeData() {
    console.log("🔍 ANALYSE APPROFONDIE DES DONNÉES");
    console.log("==================================\n");

    // 1. Quelle est la date/heure la plus récente dans la base ?
    const { data: latest } = await supabase
        .from('observations_horaire')
        .select('timestamp, station_id, t')
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log("📅 Les 10 relevés les plus récents dans la base :");
    latest.forEach(r => {
        console.log(`   ${r.timestamp} | Station ${r.station_id} | T: ${r.t}°C`);
    });

    // 2. Combien de relevés par date ?
    const { data: byDate19 } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', '2026-01-19T00:00:00Z')
        .lt('timestamp', '2026-01-20T00:00:00Z');

    const { data: byDate20 } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z');

    console.log(`\n📊 Nombre de relevés par jour :`);
    console.log(`   19/01/2026 : ${byDate19.count || 0} relevés`);
    console.log(`   20/01/2026 : ${byDate20.count || 0} relevés`);

    // 3. Combien de stations UNIQUES ont des données pour chaque jour ?
    const { data: stations19 } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-19' });

    const { data: stations20 } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-20' });

    console.log(`\n🎯 Stations avec données agrégées :`);
    console.log(`   19/01/2026 : ${stations19?.length || 0} stations`);
    console.log(`   20/01/2026 : ${stations20?.length || 0} stations`);

    // 4. Vérifier si Lille a des données pour le 20
    const { data: lille20 } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1')
        .eq('station_id', '59343001')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z')
        .order('timestamp', { ascending: false })
        .limit(5);

    console.log(`\n📍 Lille (59343001) - Données du 20/01 :`);
    if (lille20 && lille20.length > 0) {
        lille20.forEach(r => console.log(`   ${r.timestamp} | T: ${r.t}°C | Pluie: ${r.rr1}mm`));
    } else {
        console.log(`   ❌ Aucune donnée pour le 20/01`);
    }

    // 5. Diagnostic final
    console.log(`\n🧪 DIAGNOSTIC :`);
    if (byDate20.count === 0) {
        console.log(`   ❌ PROBLÈME : Aucune donnée du 20/01 dans la base.`);
        console.log(`   💡 Cause probable : Le robot n'a pas encore traité le 20/01, OU l'API MF ne fournit pas encore ces données.`);
    } else {
        console.log(`   ✅ Des données du 20/01 existent (${byDate20.count} relevés).`);
        console.log(`   ⚠️ Mais la RPC 'get_daily_extremes_full' n'en trouve aucune.`);
        console.log(`   💡 Cause probable : Bug dans la fonction SQL ou données incomplètes (pas assez de relevés pour agréger).`);
    }
}

analyzeData();
