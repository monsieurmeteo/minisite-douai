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

async function simpleFrequencyCheck() {
    console.log("🔍 VÉRIFICATION SIMPLE DE LA FRÉQUENCE");
    console.log("======================================\n");

    // Prendre 10 stations au hasard et analyser leur fréquence
    const testStations = [
        '01014002', // ARBENT
        '59343001', // Lille-Lesquin
        '59178001', // Douai
        '75114001', // Paris Montsouris
        '13004001', // Marseille
        '31069001', // Toulouse
        '69029001', // Lyon
        '44109001', // Nantes
        '33063001', // Bordeaux
        '67482001'  // Strasbourg
    ];

    const date = '2026-01-20';

    for (const stationId of testStations) {
        const { data, count } = await supabase
            .from('observations_6mn')
            .select('timestamp', { count: 'exact' })
            .eq('station_id', stationId)
            .gte('timestamp', `${date}T00:00:00Z`)
            .lt('timestamp', `${date}T23:59:59Z`)
            .order('timestamp', { ascending: true })
            .limit(300);

        if (data && data.length > 1) {
            // Calculer l'intervalle entre les 2 premiers relevés
            const time1 = new Date(data[0].timestamp);
            const time2 = new Date(data[1].timestamp);
            const intervalMin = (time2 - time1) / (1000 * 60);

            let type = "Autre";
            if (intervalMin <= 10) {
                type = "6 minutes";
            } else if (intervalMin >= 50 && intervalMin <= 70) {
                type = "Horaire";
            }

            console.log(`${stationId} : ${count} relevés | Intervalle: ${intervalMin.toFixed(0)} min | Type: ${type}`);
        } else {
            console.log(`${stationId} : Pas de données`);
        }
    }

    console.log("\n💡 CONCLUSION :");
    console.log("Si la majorité affiche '6 minutes', alors la plupart des stations mesurent toutes les 6 min.");
    console.log("Si la majorité affiche 'Horaire', alors la plupart mesurent toutes les heures.");
}

simpleFrequencyCheck();
