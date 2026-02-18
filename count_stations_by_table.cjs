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

async function countStations() {
    console.log("📊 COMPTAGE DES STATIONS PAR TABLE");
    console.log("===================================\n");

    // Stations dans observations_6mn pour le 20/01
    const { data: stations6mn } = await supabase
        .from('observations_6mn')
        .select('station_id')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z');

    const unique6mn = [...new Set(stations6mn?.map(s => s.station_id) || [])];
    console.log(`📡 observations_6mn (20/01):`);
    console.log(`   Stations uniques : ${unique6mn.length}`);
    console.log(`   Total relevés : ${stations6mn?.length || 0}`);

    // Stations dans observations_horaire pour le 20/01
    const { data: stationsHoraire } = await supabase
        .from('observations_horaire')
        .select('station_id')
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z');

    const uniqueHoraire = [...new Set(stationsHoraire?.map(s => s.station_id) || [])];
    console.log(`\n⏰ observations_horaire (20/01):`);
    console.log(`   Stations uniques : ${uniqueHoraire.length}`);
    console.log(`   Total relevés : ${stationsHoraire?.length || 0}`);

    // Stations dans les DEUX tables
    const inBoth = unique6mn.filter(id => uniqueHoraire.includes(id));
    console.log(`\n🔄 Stations dans LES DEUX tables : ${inBoth.length}`);

    // Stations UNIQUEMENT dans 6mn
    const only6mn = unique6mn.filter(id => !uniqueHoraire.includes(id));
    console.log(`\n📡 Stations UNIQUEMENT dans 6mn : ${only6mn.length}`);

    // Stations UNIQUEMENT dans horaire
    const onlyHoraire = uniqueHoraire.filter(id => !unique6mn.includes(id));
    console.log(`⏰ Stations UNIQUEMENT dans horaire : ${onlyHoraire.length}`);

    // Total unique
    const allUnique = [...new Set([...unique6mn, ...uniqueHoraire])];
    console.log(`\n🎯 TOTAL stations avec données (20/01) : ${allUnique.length}`);

    // Vérifier pour le 19/01 aussi
    const { data: stations19 } = await supabase
        .from('observations_horaire')
        .select('station_id')
        .gte('timestamp', '2026-01-19T00:00:00Z')
        .lt('timestamp', '2026-01-20T00:00:00Z');

    const unique19 = [...new Set(stations19?.map(s => s.station_id) || [])];
    console.log(`\n📅 observations_horaire (19/01) : ${unique19.length} stations`);
}

countStations();
