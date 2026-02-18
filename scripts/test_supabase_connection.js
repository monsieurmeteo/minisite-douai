
// Script de vérification de la connexion Supabase
import fs from 'fs';
import path from 'path';

// Lire le .env.local pour récupérer les clés
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Clés Supabase introuvables dans .env.local");
    process.exit(1);
}

const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_KEY = keyMatch[1].trim();

console.log(`🔎 Test de connexion vers : ${SUPABASE_URL}`);

async function check() {
    try {
        // Test 1 : Vérifier si la table 'observations_horaire' existe (via l'API REST)
        // On demande juste 1 ligne pour voir
        const response = await fetch(`${SUPABASE_URL}/rest/v1/observations_horaire?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (response.ok) {
            console.log("✅ SUCCÈS : La table 'observations_horaire' est accessible !");
            const data = await response.json();
            console.log(`📊 Nombre de lignes trouvées (échantillon) : ${data.length}`);

            if (data.length === 0) {
                console.log("⚠️ La table est vide. Le robot n'a pas encore tourné ou n'a rien trouvé.");
                console.log("👉 Conseil : Allez dans Edge Functions et cliquez sur le bouton 'Run'/'Invoke' pour lancer le premier scan.");
            } else {
                console.log("🎉 BRAVO ! Le robot a déjà commencé à remplir la base. C'est gagné !");
                console.log("Dernière donnée :", data[0]);
            }
        } else {
            if (response.status === 404) {
                console.error("❌ ÉCHEC : La table 'observations_horaire' n'existe pas encore.");
                console.error("👉 Action requise : Copiez le contenu de CODE_POUR_SQL.txt et lancez-le dans SQL Editor sur Supabase.");
            } else {
                console.error(`❌ Erreur inattendue (${response.status}) :`, await response.text());
            }
        }

    } catch (e) {
        console.error("❌ Erreur de connexion réseau :", e.message);
    }
}

check();
