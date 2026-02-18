// Serveur Deno (TypeScript) pour Supabase Edge Function - UPDATE TOKEN
// Ce script doit être appelé par un CRON toutes les 50 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Identifiants Météo France (Publics/Connus)
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

Deno.serve(async (req) => {
    try {
        console.log("🔄 Renouvellement du token Météo France...");

        // 1. Encodage des identifiants en Base64 pour l'auth Basic
        const credentials = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

        // 2. Appel à l'API OAuth de Météo France
        const response = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erreur MF Token: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const newToken = data.access_token;

        if (!newToken) throw new Error("Pas de token reçu !");

        console.log("✅ Nouveau token reçu, sauvegarde en base...");

        // 3. Sauvegarde dans la table 'api_secrets'
        const { error } = await supabase
            .from('api_secrets')
            .upsert({
                provider: 'meteo_france',
                access_token: newToken,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, token_preview: newToken.substring(0, 10) + '...' }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
