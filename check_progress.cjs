
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

async function checkProgress() {
    console.log("📊 AUDIT DE PROGRESSION ROBOT");
    console.log("----------------------------");

    // 1. Total Stations connues
    const { count: totalStations } = await supabase
        .from('stations')
        .select('*', { count: 'exact', head: true });

    console.log(`🎯 Objectif Total : ${totalStations || 'Unknown'} stations`);

    // 2. Stations avec données pour HIER (19/01)
    // Note: On ne peut pas faire un COUNT(DISTINCT) simple avec l'API JS standard sans RPC,
    // mais on peut faire un hack ou juste compter les lignes si on suppose 1 ligne par heure.
    // Le mieux est d'utiliser une RPC rapide si elle existe, sinon on va juste sampler.
    // On va utiliser rpc 'get_daily_extremes_full' car elle groupe déjà ! C'est le moyen le plus intelligent.

    const { data: data19 } = await supabase.rpc('get_daily_extremes_full', { target_date: '2026-01-19' });
    const count19 = data19 ? data19.length : 0;

    console.log(`📅 HIER (19/01)      : ${count19} stations complétées (${Math.round(count19 / totalStations * 100)}%)`);

    // 3. Stations avec données pour AUJOURD'HUI (20/01)
    const { data: data20 } = await supabase.rpc('get_daily_extremes_full', { target_date: '2026-01-20' });
    const count20 = data20 ? data20.length : 0;

    console.log(`📅 AUJOURD'HUI (20/01): ${count20} stations complétées (${Math.round(count20 / totalStations * 100)}%)`);

    // 4. Check spécifique Douai (59178001)
    const douaiIn19 = data19?.find(s => s.station_id === '59178001');
    const douaiIn20 = data20?.find(s => s.station_id === '59178001');

    console.log("\n📍 Status DOUAI (59178001) :");
    console.log(`   - Données 19/01 : ${douaiIn19 ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Données 20/01 : ${douaiIn20 ? '✅ OUI' : '❌ NON (En attente)'}`);
}

checkProgress();
