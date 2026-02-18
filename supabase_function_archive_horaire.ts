// Serveur Deno (TypeScript) pour Supabase Edge Function - ARCHIVAGE HORAIRE
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPObs/v1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Deno.serve(async (req) => { ...
// Mode "SCANNER TOTAL" : Récupère la liste dynamique et archive tout.

Deno.serve(async (req) => {
    try {
        console.log("🕒 Archivage GLOBAL (Toute la France) en cours...");

        // 1. Récupérer le Token
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        if (!secrets?.access_token) throw new Error("Token manquant");
        const token = secrets.access_token;

        // 2. Récupérer la LISTE OFFICIELLE de toutes les stations
        // C'est ici que la magie opère : on ne devine plus les ID, on demande à MF.
        console.log("📋 Téléchargement de la liste des stations...");
        const listUrl = `${METEO_FRANCE_API}/liste-stations?format=json`;
        const listResp = await fetch(listUrl, { headers: { 'apikey': token } });

        let stationsToScan: string[] = [];

        if (listResp.ok) {
            const listData = await listResp.json();
            // Filtrage : On ne garde que celles qui ont un ID valide
            // On peut filtrer par département ici si besoin (ex: item.departement === '59')
            // Pour l'instant : ON PREND TOUT (~2000 stations)
            stationsToScan = listData.map((s: any) => s.id_station);
        } else {
            console.error("Impossible de lire la liste, fallback sur liste manuelle");
            stationsToScan = [
                '59178001', '59343001', '59183001', '62041001', '62160001', '59606001', '59139001', '01072001'
            ];
        }

        console.log(`🚀 Démarrage de l'archivage pour ${stationsToScan.length} stations...`);

        // 3. Boucle optimisée par BATCH (Paquets)
        // On ne peut pas faire 2000 requêtes d'un coup, mais on peut faire 20 paquets de 100 en parallèle.
        // Supabase Edge Function a une limite de temps, il faut aller vite.

        let totalSaved = 0;
        const BATCH_SIZE = 20; // 20 stations en parallèle

        // Helper pour traiter une station
        const processStation = async (stationId: string) => {
            const now = new Date();
            // On demande juste l'heure courante (pas 24h) pour économiser la bande passante et le stockage
            // Puisqu'on scanne toutes les heures, on aura l'historique naturellement.
            const url = `${METEO_FRANCE_API}/station/horaire?id_station=${stationId}&format=json`; // Sans date = dernière dispo

            try {
                const r = await fetch(url, { headers: { 'apikey': token } });
                if (!r.ok) return 0;
                const d = await r.json();
                const dataArray = Array.isArray(d) ? d : [d];
                if (dataArray.length === 0) return 0;

                // Préparer les lignes
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
                    pres: obs.pres
                }));

                // Upsert (Sauvegarde)
                const { error } = await supabase
                    .from('observations_horaire')
                    .upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

                return error ? 0 : rows.length;
            } catch {
                return 0;
            }
        };

        // Exécution par lots
        for (let i = 0; i < stationsToScan.length; i += BATCH_SIZE) {
            const batch = stationsToScan.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(id => processStation(id)));
            totalSaved += results.reduce((a, b) => a + b, 0);
        }

        return new Response(JSON.stringify({ success: true, stations_scanned: stationsToScan.length, saved_points: totalSaved }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
