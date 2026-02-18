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

async function checkArbent() {
    console.log("🔍 ANALYSE ARBENT (01014002)");
    console.log("============================\n");

    const stationId = '01014002';
    const date = '2026-01-20';

    // Vérifier observations_6mn
    const { data: data6mn, count: count6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp, t, ff, fxi', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log(`📡 observations_6mn (${date}) :`);
    console.log(`   Total relevés : ${count6mn || 0}`);
    if (data6mn && data6mn.length > 0) {
        console.log(`   Derniers relevés :`);
        data6mn.slice(0, 5).forEach(r => {
            console.log(`      ${r.timestamp} | T: ${r.t}°C | Vent: ${r.ff} km/h`);
        });
    }

    // Vérifier observations_horaire
    const { data: dataHoraire, count: countHoraire } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, ff, fxi', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log(`\n⏰ observations_horaire (${date}) :`);
    console.log(`   Total relevés : ${countHoraire || 0}`);
    if (dataHoraire && dataHoraire.length > 0) {
        console.log(`   Derniers relevés :`);
        dataHoraire.slice(0, 5).forEach(r => {
            console.log(`      ${r.timestamp} | T: ${r.t}°C | Vent: ${r.ff} km/h`);
        });
    }

    // Conclusion
    console.log(`\n📊 RÉSUMÉ :`);
    console.log(`   observations_6mn     : ${count6mn || 0} relevés`);
    console.log(`   observations_horaire : ${countHoraire || 0} relevés`);

    if (count6mn > 0 && countHoraire > 0) {
        console.log(`\n✅ ARBENT a des données dans LES DEUX tables !`);
    } else if (count6mn > 0) {
        console.log(`\n📡 ARBENT a UNIQUEMENT des données 6mn`);
    } else if (countHoraire > 0) {
        console.log(`\n⏰ ARBENT a UNIQUEMENT des données horaires`);
    } else {
        console.log(`\n❌ ARBENT n'a AUCUNE donnée pour le ${date}`);
    }
}

checkArbent();
