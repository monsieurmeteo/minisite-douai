
// ROBOT 6 MINUTES : COLLECTE HAUTE FREQUENCE
// Récupère toutes les stations d'un coup via l'API Paquet

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1';

Deno.serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log("⚡ Démarrage du SCAN 6 MINUTES...");

        // 1. Token
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        const token = secrets?.access_token;
        if (!token) throw new Error("Token manquant");

        // 2. Calcul date (Il y a un délai de diffusion, on prend T - 24min pour être sûr)
        const now = new Date();
        now.setMinutes(now.getMinutes() - 24);

        // Arrondi 6 min
        const minutes = now.getMinutes();
        const roundedMinutes = Math.floor(minutes / 6) * 6;
        now.setMinutes(roundedMinutes);
        now.setSeconds(0);

        const dateStr = now.toISOString().split('.')[0] + 'Z';
        console.log(`📅 Cible : ${dateStr}`);

        // 3. Appel API Paquet (Tout d'un coup)
        const url = `${METEO_FRANCE_API}/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
        const resp = await fetch(url, { headers: { 'apikey': token } });

        if (!resp.ok) {
            throw new Error(`Erreur API: ${resp.status} ${await resp.text()}`);
        }

        const data = await resp.json();
        console.log(`📦 Reçu : ${data.length} stations.`);

        if (!Array.isArray(data)) throw new Error("Format invalide");

        // 4. Filtrage et Préparation
        // IMPORTANT : Pour éviter de saturer la DB Gratuite (500MB), on peut filtrer ici.
        // Si vous voulez TOUT, commentez le filtre.

        // Ex: On garde tout le Nord (59) et le Pas-de-Calais (62) + Paris (75)
        // const CIBLES = ['59', '62', '75'];
        // const filtered = data.filter(s => {
        //     const id = s.geo_id_insee || s.id;
        //     return id && CIBLES.some(c => id.startsWith(c));
        // });

        // Pour l'instant : ON PREND TOUT (Mode Démo)
        const filtered = data;

        const rows = filtered.map(obs => ({
            station_id: obs.geo_id_insee || obs.id,
            timestamp: new Date(obs.validity_time || dateStr).toISOString(), // Api paquet donne pas tjs validity_time individuel
            t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
            u: obs.u,
            ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
            rr_per: obs.rr_per ?? 0,
            pres: obs.pres
        }));

        if (rows.length > 0) {
            // Upsert
            const { error } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
            if (error) throw error;
        }

        console.log(`✅ Sauvegardé : ${rows.length} points.`);

        return new Response(JSON.stringify({ success: true, count: rows.length }), { headers: { "Content-Type": "application/json" } });

    } catch (e: any) {
        console.error(e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
