// import 'dotenv/config'; // Pas nécessaire car on lit manuellement

// Simuler l'environnement
const MF_BASE_URL = 'https://public-api.meteofrance.fr/public/DPObs/v1';

// Fonction pour lire le token (simulée ici, normalement via process.env)
// Vous devez mettre votre token manuel actif ici pour tester
const TOKEN = process.env.VITE_METEO_MANUAL_TOKEN;

async function testHistory(stationId) {
    console.log(`Test historique pour la station ${stationId}...`);

    if (!TOKEN) {
        console.error("❌ Pas de token trouvé dans l'environnement de test");
        return;
    }

    try {
        const url = `${MF_BASE_URL}/station/horaire?id_station=${stationId}&format=json`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();

        console.log(`✅ Succès ! ${data.length} points de données récupérés.`);

        if (data.length > 0) {
            console.log("Premier point (le plus récent) :", data[0].validity_time);
            console.log("Dernier point (le plus ancien) :", data[data.length - 1].validity_time);
            console.log("Exemple de données :", {
                temp: data[0].t - 273.15,
                hum: data[0].u,
                pluie: data[0].rr1
            });
        }

    } catch (error) {
        console.error("❌ Erreur effrayante :", error);
    }
}

// Test avec Douai (59178001)
// Note: Node.js ne lit pas natif .env.local sans package, donc on va lire le fichier manuellement si besoin
// ou supposer que l'utilisateur a un token valide.

// On va lire le fichier .env.local pour extraire le token
import fs from 'fs';
import path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.+)/);
    if (match) {
        process.env.VITE_METEO_MANUAL_TOKEN = match[1].trim();
        await testHistory('59178001');
    } else {
        console.log("❌ Token non trouvé dans .env.local");
    }
} catch (e) {
    console.error("Erreur lecture .env.local", e);
}
