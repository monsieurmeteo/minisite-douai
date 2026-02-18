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

async function analyzeAllStations() {
    console.log("🔍 ANALYSE GLOBALE DES DONNÉES");
    console.log("==============================\n");

    const date = '2026-01-20';

    // Compter les stations UNIQUES dans chaque table
    const { data: stations6mn } = await supabase
        .from('observations_6mn')
        .select('station_id')
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .limit(50000);

    const { data: stationsHoraire } = await supabase
        .from('observations_horaire')
        .select('station_id')
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .limit(50000);

    const unique6mn = [...new Set(stations6mn?.map(s => s.station_id) || [])];
    const uniqueHoraire = [...new Set(stationsHoraire?.map(s => s.station_id) || [])];

    console.log(`📊 RÉPARTITION DES STATIONS (${date}) :`);
    console.log(`   observations_6mn     : ${unique6mn.length} stations`);
    console.log(`   observations_horaire : ${uniqueHoraire.length} stations`);

    // Stations dans les DEUX tables
    const inBoth = unique6mn.filter(id => uniqueHoraire.includes(id));
    console.log(`\n🔄 Stations dans LES DEUX tables : ${inBoth.length}`);
    if (inBoth.length > 0) {
        console.log(`   Exemples : ${inBoth.slice(0, 5).join(', ')}`);
    }

    // Stations UNIQUEMENT dans 6mn
    const only6mn = unique6mn.filter(id => !uniqueHoraire.includes(id));
    console.log(`\n📡 Stations UNIQUEMENT dans 6mn : ${only6mn.length}`);
    console.log(`   Exemples : ${only6mn.slice(0, 5).join(', ')}`);

    // Stations UNIQUEMENT dans horaire
    const onlyHoraire = uniqueHoraire.filter(id => !unique6mn.includes(id));
    console.log(`\n⏰ Stations UNIQUEMENT dans horaire : ${onlyHoraire.length}`);
    if (onlyHoraire.length > 0) {
        console.log(`   Exemples : ${onlyHoraire.slice(0, 5).join(', ')}`);
    }

    // Total unique
    const allUnique = [...new Set([...unique6mn, ...uniqueHoraire])];
    console.log(`\n🎯 TOTAL stations avec données : ${allUnique.length}`);

    // Vérifier Douai
    const douaiIn6mn = unique6mn.includes('59178001');
    const douaiInHoraire = uniqueHoraire.includes('59178001');
    console.log(`\n📍 DOUAI (59178001) :`);
    console.log(`   Dans observations_6mn     : ${douaiIn6mn ? '✅ OUI' : '❌ NON'}`);
    console.log(`   Dans observations_horaire : ${douaiInHoraire ? '✅ OUI' : '❌ NON'}`);

    // Conclusion
    console.log(`\n💡 CONCLUSION :`);
    if (uniqueHoraire.length === 0) {
        console.log(`   ⚠️ TOUTES les données du ${date} sont dans observations_6mn`);
        console.log(`   ⚠️ La table observations_horaire est VIDE pour cette date`);
        console.log(`   💡 Le robot insère tout dans observations_6mn`);
    } else {
        console.log(`   ✅ Les données sont réparties entre les deux tables`);
    }
}

analyzeAllStations();
