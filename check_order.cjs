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

async function checkOrder() {
    console.log("🔍 VÉRIFICATION DE L'ORDRE DES STATIONS");
    console.log("========================================\n");

    const { data, error } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-20' });

    if (error) {
        console.log("❌ Erreur:", error);
        return;
    }

    console.log(`Total stations retournées : ${data.length}\n`);

    console.log("📊 Les 10 premières stations :");
    data.slice(0, 10).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.station_id}`);
    });

    console.log("\n📊 Les 10 dernières stations :");
    data.slice(-10).forEach((s, i) => {
        console.log(`   ${data.length - 9 + i}. ${s.station_id}`);
    });

    // Chercher la station la plus proche de 59
    const closest59 = data.filter(s => s.station_id.startsWith('5')).slice(0, 5);
    console.log("\n📍 Stations commençant par '5' :");
    closest59.forEach(s => console.log(`   - ${s.station_id}`));

    // Vérifier si Douai serait juste après
    const station1000 = data[999];
    console.log(`\n🎯 Station #1000 : ${station1000?.station_id}`);
    console.log(`   Douai (59178001) serait-elle juste après ?`);
}

checkOrder();
