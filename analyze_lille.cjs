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

async function analyzeLille() {
    console.log("🔍 ANALYSE DÉTAILLÉE : LILLE-LESQUIN");
    console.log("====================================\n");

    const stationId = '59343001'; // Lille-Lesquin
    const date20 = '2026-01-20';
    const date19 = '2026-01-19';

    console.log(`Station : ${stationId} (Lille-Lesquin)\n`);

    // ========== 20 JANVIER ==========
    console.log("📅 DONNÉES DU 20 JANVIER 2026 :");
    console.log("================================\n");

    // observations_6mn pour le 20/01
    const { data: data6mn20, count: count6mn20 } = await supabase
        .from('observations_6mn')
        .select('timestamp, t, ff', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date20}T00:00:00Z`)
        .lt('timestamp', `${date20}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(20);

    console.log(`📡 observations_6mn :`);
    console.log(`   Total relevés : ${count6mn20 || 0}`);
    if (data6mn20 && data6mn20.length > 0) {
        console.log(`   Derniers relevés :`);
        data6mn20.slice(0, 10).forEach(r => {
            const time = new Date(r.timestamp);
            const minutes = time.getUTCMinutes();
            console.log(`      ${r.timestamp} (${minutes}min) | T: ${r.t}°C`);
        });
    }

    // observations_horaire pour le 20/01
    const { data: dataHoraire20, count: countHoraire20 } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, ff', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date20}T00:00:00Z`)
        .lt('timestamp', `${date20}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(20);

    console.log(`\n⏰ observations_horaire :`);
    console.log(`   Total relevés : ${countHoraire20 || 0}`);
    if (dataHoraire20 && dataHoraire20.length > 0) {
        console.log(`   Derniers relevés :`);
        dataHoraire20.slice(0, 10).forEach(r => {
            console.log(`      ${r.timestamp} | T: ${r.t}°C`);
        });
    }

    // ========== 19 JANVIER ==========
    console.log("\n\n📅 DONNÉES DU 19 JANVIER 2026 :");
    console.log("================================\n");

    // observations_6mn pour le 19/01
    const { data: data6mn19, count: count6mn19 } = await supabase
        .from('observations_6mn')
        .select('timestamp, t', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date19}T00:00:00Z`)
        .lt('timestamp', `${date19}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log(`📡 observations_6mn :`);
    console.log(`   Total relevés : ${count6mn19 || 0}`);
    if (data6mn19 && data6mn19.length > 0) {
        console.log(`   Derniers relevés : ${data6mn19.slice(0, 3).map(r => r.timestamp).join(', ')}`);
    }

    // observations_horaire pour le 19/01
    const { data: dataHoraire19, count: countHoraire19 } = await supabase
        .from('observations_horaire')
        .select('timestamp, t', { count: 'exact' })
        .eq('station_id', stationId)
        .gte('timestamp', `${date19}T00:00:00Z`)
        .lt('timestamp', `${date19}T23:59:59Z`)
        .order('timestamp', { ascending: false })
        .limit(10);

    console.log(`\n⏰ observations_horaire :`);
    console.log(`   Total relevés : ${countHoraire19 || 0}`);
    if (dataHoraire19 && dataHoraire19.length > 0) {
        console.log(`   Derniers relevés : ${dataHoraire19.slice(0, 3).map(r => r.timestamp).join(', ')}`);
    }

    // ========== CONCLUSION ==========
    console.log("\n\n💡 CONCLUSION POUR LILLE-LESQUIN :");
    console.log("===================================\n");

    if (count6mn20 > 0 && countHoraire20 > 0) {
        console.log(`✅ Le 20/01 : Données dans LES DEUX tables`);
        console.log(`   - observations_6mn : ${count6mn20} relevés (toutes les 6 min)`);
        console.log(`   - observations_horaire : ${countHoraire20} relevés (toutes les heures)`);
    } else if (count6mn20 > 0) {
        console.log(`📡 Le 20/01 : Données UNIQUEMENT dans observations_6mn`);
        console.log(`   - ${count6mn20} relevés`);
        if (count6mn20 > 100) {
            console.log(`   - Fréquence : Toutes les 6 minutes`);
        } else {
            console.log(`   - Fréquence : Probablement horaire (stocké dans 6mn)`);
        }
    } else if (countHoraire20 > 0) {
        console.log(`⏰ Le 20/01 : Données UNIQUEMENT dans observations_horaire`);
    } else {
        console.log(`❌ Le 20/01 : Aucune donnée`);
    }

    if (count6mn19 > 0 || countHoraire19 > 0) {
        console.log(`\n📅 Le 19/01 :`);
        if (count6mn19 > 0) console.log(`   - observations_6mn : ${count6mn19} relevés`);
        if (countHoraire19 > 0) console.log(`   - observations_horaire : ${countHoraire19} relevés`);
    }
}

analyzeLille();
