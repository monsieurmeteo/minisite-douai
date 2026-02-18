
// Script pour déclencher le robot Supabase à distance
import fs from 'fs';
import path from 'path';

// Récupération des clés
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) { console.error("❌ Clés introuvables"); process.exit(1); }

const BASE_URL = urlMatch[1].trim();
const KEY = keyMatch[1].trim();

// Nom de la fonction (souvent 'meteo-job' ou 'archive-horaire')
const FUNCTION_NAME = 'archive-horaire';

const TARGET_URL = `${BASE_URL}/functions/v1/${FUNCTION_NAME}`;

console.log(`🚀 Tentative de lancement du robot : ${TARGET_URL}`);

async function trigger() {
    try {
        const resp = await fetch(TARGET_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Force Start' })
        });

        const text = await resp.text();

        if (resp.ok) {
            console.log("✅ RÉPONSE DU ROBOT :");
            console.log(text);
            try {
                const json = JSON.parse(text);
                if (json.success) {
                    console.log(`\n🎉 VICTOIRE ! ${json.stations || json.stations_scanned || '?'} stations ont été scannées.`);
                    console.log(`💾 ${json.saved || json.saved_points || '?'} points de données sauvegardés.`);
                } else {
                    console.log("\n⚠️ Le robot a répondu, mais sans succès. Avez-vous collé le bon code ?");
                }
            } catch (e) {
                // Ce n'est pas du JSON
            }
        } else {
            console.error(`❌ Erreur ${resp.status} : ${text}`);
            console.log("👉 Vérifiez que vous avez bien 'Deploy' la fonction sur Supabase.");
        }

    } catch (e) {
        console.error("❌ Erreur Réseau :", e.message);
    }
}

trigger();
