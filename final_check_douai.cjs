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

async function checkDouai() {
    console.log("🎯 VÉRIFICATION FINALE DOUAI");
    console.log("============================\n");

    // Appel direct de la fonction RPC pour Douai
    const { data, error } = await supabase
        .rpc('get_daily_extremes_full', { target_date: '2026-01-20' });

    if (error) {
        console.error("❌ Erreur RPC:", error);
        return;
    }

    console.log(`✅ Total stations retournées : ${data.length}`);

    // Chercher Douai
    const douai = data.find(s => s.station_id === '59178001');

    if (douai) {
        console.log("\n🎉 DOUAI TROUVÉE ! 🎉");
        console.log("Données :");
        console.log(`   Temp Min : ${douai.temp_min}°C`);
        console.log(`   Temp Max : ${douai.temp_max}°C`);
        console.log(`   Rafale Max : ${douai.wind_gust_max} km/h`);
        console.log(`   Pluie Totale : ${douai.rain_total} mm`);
        console.log(`   Altitude : ${douai.altitude} m`);
    } else {
        console.log("\n❌ Douai PAS trouvée dans les résultats");
        console.log("Stations commençant par 59 :");
        const nord = data.filter(s => s.station_id.startsWith('59'));
        nord.forEach(s => console.log(`   - ${s.station_id}`));
    }
}

checkDouai();
