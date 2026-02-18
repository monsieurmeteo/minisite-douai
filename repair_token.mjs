
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function repair() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("🔄 Étape 1 : Demander un nouveau token à Météo France...");
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("❌ Échec de la récupération du token :", response.status, err);
            return;
        }

        const data = await response.json();
        const newToken = data.access_token;
        console.log("✅ Nouveau token reçu !");

        console.log("🔄 Étape 2 : Mise à jour de Supabase (api_secrets)...");
        const { error: upsertError } = await supabase
            .from('api_secrets')
            .upsert({
                provider: 'meteo_france',
                access_token: newToken,
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' });

        if (upsertError) {
            console.error("❌ Erreur lors de la mise à jour de Supabase :", upsertError.message);
        } else {
            console.log("✅ Supabase mis à jour avec le nouveau token.");
        }

        console.log("🔄 Étape 3 : Mise à jour du fichier .env.local...");
        let envContent = fs.readFileSync('.env.local', 'utf8');
        const tokenRegex = /VITE_METEO_MANUAL_TOKEN=.*/;
        if (tokenRegex.test(envContent)) {
            envContent = envContent.replace(tokenRegex, `VITE_METEO_MANUAL_TOKEN=${newToken}`);
        } else {
            envContent += `\nVITE_METEO_MANUAL_TOKEN=${newToken}`;
        }
        fs.writeFileSync('.env.local', envContent);
        console.log("✅ .env.local mis à jour.");

        console.log("\n🚀 Tout est prêt ! Les données devraient recommencer à couler.");
        console.log("Vous pouvez maintenant tester le site localement ou attendre que le robot Supabase se réveille.");

    } catch (e) {
        console.error("❌ Erreur inattendue :", e);
    }
}

repair();
