import fs from 'fs';
import path from 'path';

// URL de base pour les observations détaillées
const MF_BASE_URL = 'https://public-api.meteofrance.fr/public/DPObs/v1';

async function test6MinHistory(stationId) {
    // 1. Récupérer le token du fichier .env.local
    let token = process.env.VITE_METEO_MANUAL_TOKEN;
    if (!token) {
        try {
            const envPath = path.resolve(process.cwd(), '.env.local');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.+)/);
            if (match) token = match[1].trim();
        } catch (e) { console.error("⚠️ Impossible de lire .env.local"); }
    }

    if (!token) {
        console.error("❌ Pas de token disponible.");
        return;
    }

    console.log(`🔎 Test historique 6 minutes pour la station ${stationId}...`);

    // Essai avec l'endpoint infrahoraire-6m
    const url = `${MF_BASE_URL}/station/infrahoraire-6m?id_station=${stationId}&format=json`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();

        console.log(`✅ Succès ! ${data.length} points de données récupérés.`);
        if (data.length >= 2) {
            const t1 = new Date(data[0].validity_time);
            const t2 = new Date(data[1].validity_time);
            const diffMin = (t1 - t2) / 1000 / 60;
            console.log(`⏱️ Écart entre les mesures : ${Math.abs(diffMin)} minutes`);
            console.log("Dernière mesure :", t1.toLocaleString());
            console.log("Mesure précédente :", t2.toLocaleString());
        }
    } catch (error) {
        console.error("❌ Erreur technique :", error);
    }
}

// Test avec Douai
test6MinHistory('59178001');
