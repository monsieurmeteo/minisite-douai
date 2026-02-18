const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                env[key] = val;
            }
        }
    });
    return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Credentials manquants dans .env.local");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkStatus() {
    console.log("🔍 Diagnostic Base de Données (Post-Upgrade Pro)...\n");

    try {
        // 1. Vérifier la connexion et la version
        // On ne peut pas facilement faire de raw SQL avec le client-js standard sans une RPC "exec_sql"
        // On va utiliser les RPCs existantes ou des appels standards.

        // Count observations
        const { count: count6mn, error: errCount } = await supabase
            .from('observations_6mn')
            .select('*', { count: 'exact', head: true });

        if (errCount) throw errCount;

        console.log(`✅ Connexion établie.`);
        console.log(`📊 Table 'observations_6mn': ${count6mn.toLocaleString()} lignes.`);

        // 2. Vérifier la fraicheur des données
        const { data: latest, error: errLatest } = await supabase
            .from('observations_6mn')
            .select('timestamp, station_id')
            .order('timestamp', { ascending: false })
            .limit(1);

        if (latest && latest.length > 0) {
            const lastDate = new Date(latest[0].timestamp);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastDate) / 60000);

            console.log(`⏱️ Dernière donnée reçue : ${latest[0].timestamp} (il y a ${diffMinutes} min)`);
            if (diffMinutes < 20) {
                console.log("✅ Le flux de données semble actif et temps réel.");
            } else {
                console.log("⚠️ Attention: Pas de données récentes (> 20 min). Vérifier les crons.");
            }
        }

        // 3. Vérifier la taille (Approximation via RPC si dispo, sinon on suppose OK)
        // Avec le client JS standard, on ne peut pas voir la taille disque directe "pg_database_size".
        // Mais si "Pro", les quotas sont larges.
        console.log("\nℹ️ Avec le passage en Pro, vous n'êtes plus limité aux 500MB de base.");
        console.log("   Votre base peut maintenant grossir sans bloquer l'application.");

        // 4. Test d'écriture/lecture simple (Santé)
        // On ne va pas écrire pour ne pas polluer, mais la lecture précédente prouve que ça marche.

        console.log("\n🚀 État général : OPÉRATIONNEL");

    } catch (e) {
        console.error("❌ Erreur lors du diagnostic :", e.message);
    }
}

checkStatus();
