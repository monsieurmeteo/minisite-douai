const https = require('https');
const fs = require('fs');

// Charger le token depuis .env.local
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
const MF_TOKEN = env.VITE_MF_API_KEY || 'MISSING';

console.log("🧪 TEST API MÉTÉO-FRANCE");
console.log("------------------------");
console.log(`Token: ${MF_TOKEN.substring(0, 20)}...`);

// Test sur Lille-Lesquin (59343001)
const stationId = '59343001';
const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id-station=${stationId}&format=json`;

console.log(`\n📡 Appel API pour ${stationId}...`);

const options = {
    headers: {
        'apikey': MF_TOKEN
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.error(`❌ Erreur HTTP ${res.statusCode}`);
            console.error(data);
            return;
        }

        try {
            const json = JSON.parse(data);
            console.log(`✅ Réponse reçue (${json.length || 0} relevés)`);

            if (json.length > 0) {
                // Afficher les 5 premiers et 5 derniers
                console.log("\n📅 Premiers relevés :");
                json.slice(0, 5).forEach(r => {
                    console.log(`   ${r.validity_time || r.date_obs} | T: ${r.t ? (r.t - 273.15).toFixed(1) : 'N/A'}°C | Pluie: ${r.rr1 || 0}mm`);
                });

                console.log("\n📅 Derniers relevés :");
                json.slice(-5).forEach(r => {
                    console.log(`   ${r.validity_time || r.date_obs} | T: ${r.t ? (r.t - 273.15).toFixed(1) : 'N/A'}°C | Pluie: ${r.rr1 || 0}mm`);
                });

                // Analyse des dates
                const dates = json.map(r => (r.validity_time || r.date_obs).substring(0, 10));
                const uniqueDates = [...new Set(dates)];
                console.log(`\n📊 Dates présentes dans la réponse :`);
                uniqueDates.forEach(d => {
                    const count = dates.filter(x => x === d).length;
                    console.log(`   ${d} : ${count} relevés`);
                });

                // Vérifier si le 20/01 est présent
                const today = '2026-01-20';
                const hasToday = uniqueDates.includes(today);
                console.log(`\n🎯 Données du ${today} : ${hasToday ? '✅ OUI' : '❌ NON'}`);
            } else {
                console.log("⚠️ Aucun relevé retourné par l'API.");
            }
        } catch (e) {
            console.error("❌ Erreur de parsing JSON:", e.message);
            console.log("Réponse brute:", data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error("❌ Erreur réseau:", e.message);
});
