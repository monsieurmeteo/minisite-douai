// Serveur Deno (TypeScript) pour Supabase Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. Configuration
const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPObs/v1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Liste des départements ou stations à surveiller (Pour éviter de dépasser les quotas gratuits)
// Vous pouvez mettre '*' pour tout, mais attention au volume !
// Ici on cible le Nord (59) et le Pas-de-Calais (62) pour commencer
const DEPARTEMENTS_CIBLES = ['59', '62'];

Deno.serve(async (req) => {
    try {
        console.log("🤖 Démarrage de l'archivage 6 minutes...");

        // 2. Récupérer le Token Valide depuis la base (géré par l'autre script)
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        if (!secrets?.access_token) {
            throw new Error("Pas de token disponible via Supabase.");
        }
        const token = secrets.access_token;

        // 3. Récupérer la liste des stations actives (depuis le cache ou l'API paquet)
        // Pour simplifier ici, on va itérer sur une liste connue ou faire un appel paquet filtré
        // Dans un premier temps, on va faire simple :
        // On suppose qu'on a une table 'stations_favorites' ou on utilise une liste en dur pour tester

        // Exemple : Stations principales du Nord
        const stations = [
            '59178001', // Douai
            '59343001', // Lille-Lesquin
            '59183001', // Dunkerque
            '62041001', // Arras
            '62160001'  // Boulogne
        ];

        let totalSaved = 0;

        // 4. Boucle sur chaque station pour récupérer son historique 6mn
        for (const stationId of stations) {
            console.log(`📥 Téléchargement ${stationId}...`);

            // On demande les dernières 2h pour être sûr de rien rater
            const url = `${METEO_FRANCE_API}/station/infrahoraire-6m?id_station=${stationId}&format=json`;

            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) {
                console.error(`Erreur station ${stationId}: ${resp.status}`);
                continue;
            }

            const data = await resp.json();
            if (!Array.isArray(data)) continue;

            // Préparer les données pour l'insertion
            const rowsToInsert = data.map(obs => ({
                station_id: stationId,
                timestamp: new Date(obs.validity_time).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: (obs.fxi || obs.fxi10) ? Math.round((obs.fxi || obs.fxi10) * 3.6) : null,
                dd: obs.dd,
                rr_per: obs.rr_per ?? 0,
                pres: obs.pres
            }));

            // Upsert (Insérer ou Ignorer si existe déjà)
            const { error } = await supabase
                .from('observations_6mn')
                .upsert(rowsToInsert, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

            if (error) console.error("Erreur DB:", error);
            else totalSaved += rowsToInsert.length;
        }

        return new Response(JSON.stringify({ success: true, saved: totalSaved }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
