
// CODE ARME POUR ARCHIVAGE AUTOMATIQUE (MODE TOTAL FRANCE)
// Copiez tout ce contenu dans Supabase > Edge Functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPObs/v1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (req) => {
    try {
        console.log("🕒 Archivage GLOBAL (Toute la France) en cours...");

        // 1. Récupérer le Token Météo France depuis la table api_secrets
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        // Si pas de token en base, on peut utiliser une variable d'environnement de fallback
        const token = secrets?.access_token || Deno.env.get('METEO_FRANCE_TOKEN');

        if (!token) throw new Error("Token introuvable ! Ajoutez-le dans la table 'api_secrets' ou dans les Secrets de la fonction.");

        // 2. Récupérer la LISTE OFFICIELLE de toutes les stations
        console.log("📋 Téléchargement de la liste des stations...");
        const listUrl = `${METEO_FRANCE_API}/liste-stations?format=json`;
        const listResp = await fetch(listUrl, { headers: { 'apikey': token } });

        let stationsToScan = [];

        if (listResp.ok) {
            const listData = await listResp.json();
            // On prend TOUTES les stations (~2000+)
            stationsToScan = listData.map((s) => s.id_station);
        } else {
            console.error("⚠️ Impossible de lire la liste officielle. Utilisation de la liste de secours (Nord).");
            stationsToScan = [
                '59178001', '59343001', '59183001', '62041001', '62160001',
                '59606001', '59139001', '01072001'
            ];
        }

        console.log(`🚀 Scan lancé pour ${stationsToScan.length} stations...`);

        // 3. Boucle optimisée par BATCH (Paquets de 20 en parallèle)
        let totalSaved = 0;
        const BATCH_SIZE = 20;

        const processStation = async (stationId) => {
            // URL "Dernière observation" (rapide)
            const url = `${METEO_FRANCE_API}/station/horaire?id_station=${stationId}&format=json`;

            try {
                const r = await fetch(url, { headers: { 'apikey': token } });
                if (!r.ok) return 0;
                const d = await r.json();
                const dataArray = Array.isArray(d) ? d : [d];
                if (dataArray.length === 0) return 0;

                const rows = dataArray.map(obs => ({
                    station_id: stationId,
                    timestamp: new Date(obs.validity_time || obs.date_obs).toISOString(),
                    t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u,
                    ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                    fxi: (obs.fxi || obs.fxi10) ? Math.round((obs.fxi || obs.fxi10) * 3.6) : null,
                    dd: obs.dd,
                    rr1: obs.rr1 ?? 0,
                    pres: obs.pres,
                    vv: obs.vv
                }));

                const { error } = await supabase
                    .from('observations_horaire')
                    .upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

                return error ? 0 : rows.length;
            } catch {
                return 0;
            }
        };

        for (let i = 0; i < stationsToScan.length; i += BATCH_SIZE) {
            const batch = stationsToScan.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(processStation));
            totalSaved += results.reduce((a, b) => a + b, 0);
        }

        return new Response(JSON.stringify({ success: true, stations: stationsToScan.length, saved: totalSaved }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
