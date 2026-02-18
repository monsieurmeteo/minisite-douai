
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const tokenMatch = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);

if (!urlMatch || !keyMatch || !tokenMatch) {
    console.error("❌ Impossible de lire les clés ou le token dans .env.local");
    process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
const token = tokenMatch[1].trim();

async function fixSecrets() {
    console.log("🔧 RÉPARATION DE LA CONFIGURATION SUPABASE...");

    // 1. Inserer le token dans api_secrets (attendu par le robot)
    console.log("👉 Insertion du token dans 'api_secrets'...");

    // On nettoie d'abord pour éviter les doublons
    await supabase.from('api_secrets').delete().eq('provider', 'meteo_france');

    const { error } = await supabase.from('api_secrets').insert({
        provider: 'meteo_france',
        access_token: token,
        updated_at: new Date().toISOString()
    });

    if (error) {
        console.error("❌ Erreur insertion api_secrets:", error);

        // Si la table n'existe pas ou erreur de colonne, on essaie de la créer via SQL (si on avait les droits admin SQL, mais ici on est client)
        // On ne peut pas CREER de table via le client JS standard si on n'est pas admin complet, mais on peut essayer d'utiliser l'autre table 'secrets' si le robot est modifiable.
        // MAIS le robot est déjà déployé on suppose.

        console.log("⚠️ Echec insertion. Vérifiez que la table 'api_secrets' existe bien.");
    } else {
        console.log("✅ Token inséré succès dans 'api_secrets' !");
    }

    // 2. Vérification rapide
    const { data } = await supabase.from('api_secrets').select('*');
    console.log("État actuel de api_secrets :", data);
}

fixSecrets();
