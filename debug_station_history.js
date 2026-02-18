// Test de diagnostic : Pourquoi l'historique ne s'affiche pas ?
import fs from 'fs';
import path from 'path';

// Simulation de la logique api.js
const TEST_STATION_SHORT = '59183'; // Dunkerque (Code INSEE)
const TEST_STATION_LONG = '59183001'; // Dunkerque (ID Station probable)

// Récupération token
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const tokenMatch = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (token) {
    console.log(`🔑 Token utilisé: ${token.substring(0, 15)}...`);
} else {
    console.error("❌ Pas de token trouvé dans .env.local");
    process.exit(1);
}

async function testFetch(stationId, label) {
    console.log(`\n🔎 Test pour ${label} (ID: ${stationId})...`);

    // Dates : 24 dernières heures
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateFin = now.toISOString();
    const dateDebut = yesterday.toISOString();

    // Test simple SANS DATES pour voir si l'appel de base fonctionne
    // Test simple SANS DATES pour voir si l'appel de base fonctionne
    // RETOUR A L'URL OFFICIELLE
    const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}&format=json`;
    // const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}&date_debut=${dateDebut}&date_fin=${dateFin}&format=json`;

    try {
        const resp = await fetch(url, {
            headers: {
                'apikey': token,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                // 'Authorization': `Bearer ${token}` 
            }
        });

        const textData = await resp.text();

        if (resp.ok) {
            try {
                const data = JSON.parse(textData);
                console.log(`✅ SUCCÈS pour ${label}: ${data.length} observations.`);
                // console.log(data[0]);
                return true;
            } catch (e) {
                console.error(`❌ ERREUR JSON pour ${label}:`, e.message);
                console.error("Sauvegarde du contenu HTML dans debug_output.html...");
                fs.writeFileSync('debug_output.html', textData);
                return false;
            }
        } else {
            console.error(`❌ ÉCHEC pour ${label}: Status ${resp.status}`);
            console.error("Contenu erreur:", textData.substring(0, 200));
            return false;
        }
    } catch (e) {
        console.error(`❌ CRASH pour ${label}:`, e.message);
        return false;
    }
}

async function run() {
    console.log("--- DIAGNOSTIC V3 ---");
    // Test Ceyzériat (01072001)
    await testFetch('01072001', "Ceyzériat (01072001)");
}

run();
