import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clés API Météo-France (Si Token invalide, on regénère)
const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('PROJECT_URL')!;
        const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY')!; // Nom autorisé
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("🚀 START: Smart Update 6mn");

        // 1. Get Token
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        let token = secrets?.access_token;

        // Function call API
        const callApi = async (dateStr: string, currentToken: string) => {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
            return await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        };

        // Function Refresh Token
        const refreshToken = async () => {
            console.log('🔄 Refreshing Token...');
            const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
            const res = await fetch('https://portail-api.meteofrance.fr/token', {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=client_credentials'
            });
            if (!res.ok) throw new Error('Token refresh failed');
            const data = await res.json();
            await supabase.from('api_secrets').upsert({ provider: 'meteo_france', access_token: data.access_token, updated_at: new Date().toISOString() });
            return data.access_token;
        };

        // 2. Determine Missing Slots (Smart Logic)
        const { data: lastRecord } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);

        // If DB empty, start 1 hour ago. Else start after last record.
        const lastTs = lastRecord?.[0]?.timestamp ? new Date(lastRecord[0].timestamp) : new Date(Date.now() - 60 * 60 * 1000);
        const now = new Date();

        // T-2 min : C'est le délai minimum car Météo-France finit de compiler ses paquets 
        // entre 120 et 240 secondes après l'heure pile du créneau de 6 min.
        const limitDate = new Date(now.getTime() - 2 * 60000);

        const slotsToFetch: Date[] = [];
        // Round lastTs to nearest 6mn if needed
        let reader = new Date(Math.floor(lastTs.getTime() / 360000) * 360000 + 360000);

        while (reader <= limitDate) {
            // Round to nearest 6mn
            reader.setMinutes(Math.floor(reader.getMinutes() / 6) * 6, 0, 0);

            if (reader > lastTs) {
                slotsToFetch.push(new Date(reader));
            }
            reader = new Date(reader.getTime() + 6 * 60000);

            // Safety: Max 5 slots per run to avoid Timeout on Edge Function
            if (slotsToFetch.length >= 5) break;
        }

        if (slotsToFetch.length === 0) {
            console.log("✅ Up to date.");
            return new Response(JSON.stringify({ status: "Up to date" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`📥 Fetching ${slotsToFetch.length} slots: ${slotsToFetch.map(d => d.toISOString()).join(', ')}`);

        let totalInserted = 0;

        for (const slot of slotsToFetch) {
            const dateStr = slot.toISOString().split('.')[0] + 'Z';

            let res = await callApi(dateStr, token);

            if (res.status === 401) {
                token = await refreshToken();
                res = await callApi(dateStr, token);
            }

            if (res.status === 404 || res.status === 400 || res.status === 204) {
                console.log(`⚠️ No data for ${dateStr} (yet)`);
                continue;
            }

            if (!res.ok) {
                console.log(`❌ Error ${res.status} for ${dateStr}`);
                continue;
            }

            const data = await res.json();
            if (!Array.isArray(data)) continue;

            // Transform
            const rows = data.map((obs: any) => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: new Date(obs.validity_time || dateStr).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pmer ? Math.round(obs.pmer / 100 * 10) / 10 : null, // Sea level pressure (hPa)
                rr_per: obs.rr_per || 0
            })).filter((r: any) => r.station_id);

            // Insert
            const { error } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp' });

            if (!error) {
                totalInserted += rows.length;
                console.log(`✅ ${rows.length} inserted for ${dateStr}`);

                // 3. --- ROBOT DE SURVEILLANCE DES ALERTES UTILISATEURS (LOGIQUE BLINDÉE) ---
                console.log("🔍 Checking active user alerts...");
                const { data: userConfigs } = await supabase.from('user_station_configs').select('*');

                if (userConfigs && userConfigs.length > 0) {
                    for (const config of userConfigs) {
                        // On cherche le relevé le plus récent dans les 15 dernières minutes pour cette station
                        const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();
                        const { data: recentObs } = await supabase
                            .from('observations_6mn')
                            .select('*')
                            .eq('station_id', config.nearest_station_id)
                            .gte('timestamp', fifteenMinsAgo)
                            .order('timestamp', { ascending: false })
                            .limit(1);

                        if (!recentObs || recentObs.length === 0) continue;
                        const obs = recentObs[0];

                        let alertMsg = null;
                        let tags = '';

                        // Alerte Vent (Gusts fxi)
                        if (config.alert_wind_enabled && obs.fxi !== null && obs.fxi >= (config.alert_wind_threshold || 80)) {
                            alertMsg = `💨 VENT FORT : ${obs.fxi} km/h à ${config.city_name} (Station: ${config.nearest_station_name})`;
                            tags = 'wind,warning';
                        }
                        // Alerte Pluie (rr_per sur 6mn -> converti pour seuil mm/h)
                        else if (config.alert_rain_enabled && obs.rr_per !== null && (obs.rr_per * 10) >= (config.alert_rain_threshold || 10)) {
                            alertMsg = `🌧️ PLUIE : Forte intensité à ${config.city_name} (${obs.rr_per}mm en 6mn)`;
                            tags = 'droplets,umbrella';
                        }
                        // Alerte Froid
                        else if (config.alert_tmin_enabled && obs.t !== null && obs.t <= (config.alert_tmin_threshold || 0)) {
                            alertMsg = `❄️ FROID : ${obs.t}°C à ${config.city_name} (Seuil < ${config.alert_tmin_threshold})`;
                            tags = 'snowflake,cold';
                        }
                        // Alerte Chaleur
                        else if (config.alert_tmax_enabled && obs.t !== null && obs.t >= (config.alert_tmax_threshold || 35)) {
                            alertMsg = `🔥 CHALEUR : ${obs.t}°C à ${config.city_name} (Seuil > ${config.alert_tmax_threshold})`;
                            tags = 'fire,hot';
                        }

                        if (alertMsg) {
                            // On vérifie si on a déjà envoyé CETTE alerte (même station, même timestamp)
                            // On utilise le cache local de la fonction ou on fait confiance à ntfy pour le dedupe
                            console.log(`🚀 ALERT TRIGGERED for ${config.city_name} on ${config.ntfy_topic} : ${alertMsg}`);
                            await fetch(`https://ntfy.sh/${config.ntfy_topic}`, {
                                method: 'POST', body: alertMsg,
                                headers: { 'Title': `Meteo Pro Alerte - ${config.city_name}`, 'Priority': 'high', 'Tags': tags }
                            });
                        }
                    }
                }
            } else {
                console.error(`❌ DB Error: ${error.message}`);
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: slotsToFetch.length, inserted: totalInserted }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ FATAL:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
