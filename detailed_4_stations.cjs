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

async function detailedAnalysis() {
    console.log("🔬 ANALYSE DÉTAILLÉE DE 4 STATIONS");
    console.log("===================================\n");

    const stations = [
        { id: '59178001', name: 'DOUAI' },
        { id: '75114001', name: 'PARIS MONTSOURIS' },
        { id: '59183001', name: 'DUNKERQUE' },
        { id: '59512001', name: 'ROUBAIX' }
    ];

    const date = '2026-01-20';

    for (const station of stations) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📍 ${station.name} (${station.id})`);
        console.log(`${'='.repeat(60)}\n`);

        // ========== observations_6mn ==========
        const { data: data6mn, count: count6mn } = await supabase
            .from('observations_6mn')
            .select('timestamp, t, ff, fxi, rr_per, u, pres', { count: 'exact' })
            .eq('station_id', station.id)
            .gte('timestamp', `${date}T00:00:00Z`)
            .lt('timestamp', `${date}T23:59:59Z`)
            .order('timestamp', { ascending: false })
            .limit(20);

        console.log(`📡 TABLE observations_6mn :`);
        console.log(`   Total relevés : ${count6mn || 0}`);

        if (data6mn && data6mn.length > 0) {
            console.log(`   Derniers relevés (10 premiers) :`);
            data6mn.slice(0, 10).forEach(r => {
                const time = new Date(r.timestamp);
                const heure = time.getUTCHours().toString().padStart(2, '0');
                const minutes = time.getUTCMinutes().toString().padStart(2, '0');
                console.log(`      ${heure}:${minutes} | T:${r.t}°C | Vent:${r.ff || 'N/A'} | Rafale:${r.fxi || 'N/A'} | Pluie:${r.rr_per || 0}mm`);
            });

            // Analyser la fréquence
            if (data6mn.length > 1) {
                const time1 = new Date(data6mn[1].timestamp);
                const time2 = new Date(data6mn[0].timestamp);
                const intervalMin = (time2 - time1) / (1000 * 60);
                console.log(`   Intervalle entre relevés : ${intervalMin.toFixed(0)} minutes`);
            }

            // Compter les relevés horaires (minutes === 0)
            const horaireCount = data6mn.filter(r => {
                const time = new Date(r.timestamp);
                return time.getUTCMinutes() === 0;
            }).length;
            console.log(`   Dont relevés horaires (XX:00) : ${horaireCount}/${data6mn.length}`);
        } else {
            console.log(`   ❌ Aucune donnée`);
        }

        // ========== observations_horaire ==========
        const { data: dataHoraire, count: countHoraire } = await supabase
            .from('observations_horaire')
            .select('timestamp, t, ff, fxi, rr1, u, pres', { count: 'exact' })
            .eq('station_id', station.id)
            .gte('timestamp', `${date}T00:00:00Z`)
            .lt('timestamp', `${date}T23:59:59Z`)
            .order('timestamp', { ascending: false })
            .limit(20);

        console.log(`\n⏰ TABLE observations_horaire :`);
        console.log(`   Total relevés : ${countHoraire || 0}`);

        if (dataHoraire && dataHoraire.length > 0) {
            console.log(`   Derniers relevés :`);
            dataHoraire.slice(0, 10).forEach(r => {
                const time = new Date(r.timestamp);
                const heure = time.getUTCHours().toString().padStart(2, '0');
                console.log(`      ${heure}:00 | T:${r.t}°C | Vent:${r.ff || 'N/A'} | Rafale:${r.fxi || 'N/A'} | Pluie:${r.rr1 || 0}mm`);
            });
        } else {
            console.log(`   ❌ Aucune donnée`);
        }

        // ========== CONCLUSION ==========
        console.log(`\n💡 CONCLUSION :`);
        if (count6mn > 0 && countHoraire > 0) {
            console.log(`   ✅ Données dans LES DEUX tables`);
        } else if (count6mn > 0) {
            console.log(`   📡 Données UNIQUEMENT dans observations_6mn`);
        } else if (countHoraire > 0) {
            console.log(`   ⏰ Données UNIQUEMENT dans observations_horaire`);
        } else {
            console.log(`   ❌ Aucune donnée pour cette station`);
        }
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 RÉSUMÉ GLOBAL`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Si toutes les stations ont des données UNIQUEMENT dans observations_6mn,`);
    console.log(`alors on peut simplifier en lisant uniquement cette table.`);
}

detailedAnalysis();
