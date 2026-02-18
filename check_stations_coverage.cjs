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

async function checkStations() {
    console.log("📊 ANALYSE DES STATIONS");
    console.log("=======================\n");

    // Total stations dans la table stations
    const { count: totalStations } = await supabase
        .from('stations')
        .select('*', { count: 'exact', head: true });

    console.log(`🎯 Total stations dans la base : ${totalStations}`);

    // Stations avec données pour le 20/01 (observations_6mn)
    const { data: with6mn } = await supabase
        .from('observations_6mn')
        .select('station_id')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z')
        .limit(50000);

    const unique6mn = [...new Set(with6mn?.map(s => s.station_id) || [])];
    console.log(`\n📡 Stations avec données 6mn (20/01) : ${unique6mn.length}`);

    // Stations avec données pour le 20/01 (observations_horaire)
    const { data: withHoraire } = await supabase
        .from('observations_horaire')
        .select('station_id')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z')
        .limit(50000);

    const uniqueHoraire = [...new Set(withHoraire?.map(s => s.station_id) || [])];
    console.log(`⏰ Stations avec données horaire (20/01) : ${uniqueHoraire.length}`);

    // Total unique avec données
    const allWithData = [...new Set([...unique6mn, ...uniqueHoraire])];
    console.log(`\n✅ Total stations avec données (20/01) : ${allWithData.length}`);

    // Stations SANS données
    const missing = totalStations - allWithData.length;
    console.log(`❌ Stations SANS données (20/01) : ${missing}`);

    // Pourcentage de couverture
    const coverage = ((allWithData.length / totalStations) * 100).toFixed(1);
    console.log(`\n📊 Couverture : ${coverage}%`);

    // Vérifier pour le 19/01
    const { data: with19 } = await supabase
        .from('observations_horaire')
        .select('station_id')
        .gte('timestamp', '2026-01-19T00:00:00Z')
        .lt('timestamp', '2026-01-20T00:00:00Z')
        .limit(50000);

    const unique19 = [...new Set(with19?.map(s => s.station_id) || [])];
    console.log(`\n📅 Stations avec données (19/01) : ${unique19.length}`);
}

checkStations();
