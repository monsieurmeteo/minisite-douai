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

async function analyzeFrequency() {
    console.log("🔍 ANALYSE DE LA FRÉQUENCE DES MESURES");
    console.log("======================================\n");

    const date = '2026-01-20';

    // Récupérer un échantillon de stations avec leurs relevés
    const { data: allData } = await supabase
        .from('observations_6mn')
        .select('station_id, timestamp')
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .limit(50000);

    if (!allData || allData.length === 0) {
        console.log("❌ Aucune donnée trouvée");
        return;
    }

    // Grouper par station
    const stationData = {};
    allData.forEach(row => {
        if (!stationData[row.station_id]) {
            stationData[row.station_id] = [];
        }
        stationData[row.station_id].push(new Date(row.timestamp));
    });

    console.log(`📊 Total stations analysées : ${Object.keys(stationData).length}\n`);

    // Analyser la fréquence pour chaque station
    const stations6mn = [];
    const stationsHoraire = [];
    const stationsAutre = [];

    Object.entries(stationData).forEach(([stationId, timestamps]) => {
        const count = timestamps.length;

        // Trier les timestamps
        timestamps.sort((a, b) => a - b);

        // Calculer l'intervalle moyen entre les relevés
        if (timestamps.length > 1) {
            const intervals = [];
            for (let i = 1; i < Math.min(timestamps.length, 10); i++) {
                const diff = (timestamps[i] - timestamps[i - 1]) / (1000 * 60); // en minutes
                intervals.push(diff);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            if (avgInterval < 15) {
                stations6mn.push({ id: stationId, count, interval: avgInterval });
            } else if (avgInterval >= 50 && avgInterval <= 70) {
                stationsHoraire.push({ id: stationId, count, interval: avgInterval });
            } else {
                stationsAutre.push({ id: stationId, count, interval: avgInterval });
            }
        }
    });

    console.log("📡 STATIONS AVEC MESURES 6 MINUTES :");
    console.log(`   Nombre : ${stations6mn.length}`);
    if (stations6mn.length > 0) {
        console.log(`   Exemples :`);
        stations6mn.slice(0, 5).forEach(s => {
            console.log(`      ${s.id} : ${s.count} relevés (intervalle: ${s.interval.toFixed(1)} min)`);
        });
    }

    console.log("\n⏰ STATIONS AVEC MESURES HORAIRES :");
    console.log(`   Nombre : ${stationsHoraire.length}`);
    if (stationsHoraire.length > 0) {
        console.log(`   Exemples :`);
        stationsHoraire.slice(0, 5).forEach(s => {
            console.log(`      ${s.id} : ${s.count} relevés (intervalle: ${s.interval.toFixed(1)} min)`);
        });
    }

    console.log("\n❓ STATIONS AVEC AUTRE FRÉQUENCE :");
    console.log(`   Nombre : ${stationsAutre.length}`);
    if (stationsAutre.length > 0) {
        console.log(`   Exemples :`);
        stationsAutre.slice(0, 5).forEach(s => {
            console.log(`      ${s.id} : ${s.count} relevés (intervalle: ${s.interval.toFixed(1)} min)`);
        });
    }

    // Statistiques
    const total = stations6mn.length + stationsHoraire.length + stationsAutre.length;
    console.log("\n📊 RÉPARTITION :");
    console.log(`   Mesures 6 min  : ${stations6mn.length}/${total} (${((stations6mn.length / total) * 100).toFixed(1)}%)`);
    console.log(`   Mesures horaire: ${stationsHoraire.length}/${total} (${((stationsHoraire.length / total) * 100).toFixed(1)}%)`);
    console.log(`   Autre fréquence: ${stationsAutre.length}/${total} (${((stationsAutre.length / total) * 100).toFixed(1)}%)`);

    console.log("\n💡 CONCLUSION :");
    if (stations6mn.length > stationsHoraire.length * 2) {
        console.log("   La majorité des stations mesurent toutes les 6 minutes");
    } else if (stationsHoraire.length > stations6mn.length * 2) {
        console.log("   La majorité des stations mesurent toutes les heures");
    } else {
        console.log("   Les stations sont réparties entre 6 min et horaire");
    }
}

analyzeFrequency();
