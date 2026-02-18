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

async function checkBothTables() {
    console.log("🔍 VÉRIFICATION DES DEUX TABLES");
    console.log("================================\n");

    // Table observations_horaire
    const { data: horaire, count: countHoraire } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact' })
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z')
        .limit(3);

    console.log(`📊 observations_horaire (20/01) : ${countHoraire || 0} relevés`);
    if (horaire && horaire.length > 0) {
        horaire.forEach(r => console.log(`   ${r.timestamp} | Station ${r.station_id}`));
    }

    // Table observations_6mn
    const { data: sixmn, count: count6mn } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact' })
        .gte('timestamp', '2026-01-20T00:00:00Z')
        .lt('timestamp', '2026-01-21T00:00:00Z')
        .limit(3);

    console.log(`\n📊 observations_6mn (20/01) : ${count6mn || 0} relevés`);
    if (sixmn && sixmn.length > 0) {
        sixmn.forEach(r => console.log(`   ${r.timestamp} | Station ${r.station_id}`));
    }

    // Douai dans les deux tables
    const { data: douaiH } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .eq('station_id', '59178001')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { data: douai6 } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .eq('station_id', '59178001')
        .order('timestamp', { ascending: false })
        .limit(1);

    console.log(`\n📍 Douai (59178001) :`);
    console.log(`   observations_horaire : ${douaiH?.[0]?.timestamp || 'Aucune'}`);
    console.log(`   observations_6mn     : ${douai6?.[0]?.timestamp || 'Aucune'}`);
}

checkBothTables();
