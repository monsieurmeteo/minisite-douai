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

async function countReal() {
    console.log("📊 COMPTAGE RÉEL (avec agrégation SQL)");
    console.log("======================================\n");

    // Utiliser une requête SQL pour compter les stations DISTINCTES
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT COUNT(DISTINCT station_id) as nb_stations
            FROM observations_6mn
            WHERE timestamp >= '2026-01-20T00:00:00Z'
            AND timestamp < '2026-01-21T00:00:00Z'
        `
    });

    if (error) {
        console.log("❌ Erreur (fonction exec_sql n'existe pas)");
        console.log("On va compter manuellement avec LIMIT élevé...\n");

        // Plan B : Récupérer avec LIMIT très élevé
        const { data: all, count } = await supabase
            .from('observations_6mn')
            .select('station_id', { count: 'exact' })
            .gte('timestamp', '2026-01-20T00:00:00Z')
            .lt('timestamp', '2026-01-21T00:00:00Z')
            .limit(50000);  // Limite très élevée

        console.log(`📡 observations_6mn (20/01):`);
        console.log(`   Total relevés (count exact) : ${count}`);
        console.log(`   Relevés récupérés : ${all?.length || 0}`);

        if (all && all.length > 0) {
            const unique = [...new Set(all.map(s => s.station_id))];
            console.log(`   Stations uniques : ${unique.length}`);
        }
    } else {
        console.log("✅ Résultat SQL:", data);
    }
}

countReal();
