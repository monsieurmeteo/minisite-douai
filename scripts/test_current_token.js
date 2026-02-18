
import fs from 'fs';
import path from 'path';

// Load token from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const tokenMatch = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);

if (!tokenMatch) {
    console.error("❌ Pas de token trouvé dans .env.local");
    process.exit(1);
}

const token = tokenMatch[1].trim();

async function testToken() {
    console.log("🔍 Test du token avec une vraie requête de données...");

    // Test URL: Données horaires pour Douai ( ou une station qui existe surement)
    // Douai: 59178001
    const stationId = '59178001';
    const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}&format=json`;

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': token
            }
        });

        console.log(`📡 Status Code: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log("✅ API OK ! Données reçues :");
            console.log(JSON.stringify(data).substring(0, 200) + "...");

            if (Array.isArray(data) && data.length > 0) {
                console.log(`📊 ${data.length} points de données trouvés pour la station ${stationId}.`);
            } else {
                console.log("⚠️ Réponse vide (pas de données pour cette station, mais l'API a répondu).");
            }
        } else {
            console.log("❌ Erreur API.");
            console.log(await response.text());
        }
    } catch (error) {
        console.error("❌ Erreur:", error);
    }
}

testToken();
