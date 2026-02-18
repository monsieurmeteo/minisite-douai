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

async function quickCheck() {
    console.log("🔍 VÉRIFICATION RAPIDE");
    console.log("=====================\n");

    // Les 5 relevés les plus récents
    const { data: latest } = await supabase
        .from('observations_horaire')
        .select('timestamp, station_id, t')
        .order('timestamp', { ascending: false })
        .limit(5);

    console.log("📅 Les 5 relevés les plus récents :");
    latest.forEach(r => {
        const date = new Date(r.timestamp);
        console.log(`   ${r.timestamp} | Station ${r.station_id} | T: ${r.t}°C`);
    });

    // Compter les relevés du 20/01
    const { count } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z');

    console.log(`\n📊 Nombre de relevés du 20/01 : ${count || 0}`);

    // Vérifier Douai spécifiquement
    const { data: douai } = await supabase
        .from('observations_horaire')
        .select('timestamp, t')
        .eq('station_id', '59178001')
        .order('timestamp', { ascending: false })
        .limit(3);

    console.log(`\n📍 Douai (59178001) - Derniers relevés :`);
    if (douai && douai.length > 0) {
        douai.forEach(r => console.log(`   ${r.timestamp} | T: ${r.t}°C`));
    } else {
        console.log(`   ❌ Aucune donnée pour Douai`);
    }
}

quickCheck();
