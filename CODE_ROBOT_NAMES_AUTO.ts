import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default {
    async fetch(req: Request) {
        const start = Date.now();
        try {
            console.log("🤖 :::: ROBOT CLIMATO V2 (Extrêmes & Soleil) :::: 🤖");

            // 1. Config & Auth
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            if (!supabaseUrl || !supabaseKey) {
                throw new Error("Misconfiguration: Env vars missing.");
            }

            const supabase = createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false }
            });

            // 2. Get API Token
            const { data: secrets, error: secretError } = await supabase
                .from('api_secrets')
                .select('access_token')
                .eq('provider', 'meteo_france')
                .single();

            if (secretError || !secrets?.access_token) {
                throw new Error("Fatal: No MF token found.");
            }
            const token = secrets.access_token;

            // 3. Get Station List (Metadata)
            // On met à jour la liste complète pour avoir les altitudes et noms officiels
            console.log("🌍 Updating Station Metadata...");
            const listResp = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!listResp.ok) throw new Error("Failed to fetch station list");

            const csvText = await listResp.text();
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(';').map((h: string) => h.trim());

            const rawStations = lines.slice(1).map(line => {
                const values = line.split(';');
                const obj: any = {};
                headers.forEach((h, i) => {
                    obj[h] = values[i]?.trim();
                });
                return obj;
            });

            const stationMetadata = rawStations
                .filter((s: any) => s.Id_station && s.Nom_usuel)
                .map((s: any) => {
                    const id = s.Id_station;
                    let dept = id.substring(0, 2);

                    // Outre-Mer (3 digits)
                    if (id.startsWith('97') || id.startsWith('98')) {
                        dept = id.substring(0, 3);
                    }

                    return {
                        id: id,
                        name: s.Nom_usuel,
                        lat: parseFloat(s.Latitude) || null,
                        lon: parseFloat(s.Longitude) || null,
                        altitude: parseInt(s.Altitude) || null,
                        dept: dept
                    };
                });

            // Upsert metadata (par lots de 100 pour être sûr)
            for (let i = 0; i < stationMetadata.length; i += 100) {
                await supabase.from('stations').upsert(stationMetadata.slice(i, i + 100), { onConflict: 'id' });
            }
            console.log(`✅ ${stationMetadata.length} stations synced.`);

            // 4. Prioritize & Select Stations to Fetch
            // On priorise la Corse (2A, 2B) et le Nord (59, 62) + Random
            const hdfPrefixes = ['02', '59', '60', '62', '80', '2A', '2B'];

            const priority = stationMetadata.filter((s: any) => hdfPrefixes.some(p => s.id.startsWith(p)));
            const others = stationMetadata.filter((s: any) => !hdfPrefixes.some(p => s.id.startsWith(p)));
            others.sort(() => Math.random() - 0.5);

            // On traite environ 60 stations par run pour rester sous la limite de 60s
            // (Batch size ajusté pour la sécurité)
            const queue = [...priority, ...others];

            let fetchedCount = 0;
            let insertedCount = 0;
            const PARALLEL = 10;

            console.log(`🔄 Processing observations loop (Queue: ${queue.length})...`);

            for (let i = 0; i < queue.length; i += PARALLEL) {
                // Time Check (stop if > 50s elapsed)
                if (Date.now() - start > 50000) {
                    console.log("⚠️ Timeout Limit reaching - Stopping gracefully.");
                    break;
                }

                const batch = queue.slice(i, i + PARALLEL);

                await Promise.all(batch.map(async (s: any) => {
                    try {
                        // Fetch HOURLY data (car contient rr1, rr3, insolh, etc.)
                        const obsResp = await fetch(`https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${s.id}&format=json`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (obsResp.ok) {
                            const obsData = await obsResp.json();

                            // Transformation & Mapping des données
                            const records = obsData
                                .filter((it: any) => (it.geo_id_insee || s.id) && (it.validity_time || it.date_obs))
                                .map((it: any) => {
                                    // Mapping intelligent des pluies
                                    // rr1 = pluie horaire
                                    // rr_per = souvent absent en horaire, on utilise rr1
                                    const rainVal = it.rr1 !== null ? it.rr1 : 0;

                                    return {
                                        station_id: it.geo_id_insee || s.id, // Pour les stations OMM, utiliser l'ID de la requête
                                        timestamp: new Date(it.validity_time || it.date_obs).toISOString(),
                                        t: it.t !== null ? Math.round((it.t - 273.15) * 10) / 10 : null,
                                        ff: it.ff !== null ? Math.round(it.ff * 3.6) : null,
                                        fxi: it.fxi !== null ? Math.round(it.fxi * 3.6) : null,
                                        dd: it.dd,
                                        u: it.u,
                                        pres: it.pres,
                                        // Nouveaux champs climato
                                        rr1: it.rr1,
                                        rr3: it.rr3,
                                        rr6: it.rr6,
                                        rr12: it.rr12,
                                        rr24: it.rr24,
                                        tn12: it.tn12, // Nouveau champ précis
                                        tx12: it.tx12, // Nouveau champ précis
                                        insolh: it.insolh,
                                        // Champ legacy pour table 6mn
                                        rr_per: rainVal
                                    };
                                });

                            if (records.length > 0) {
                                // Insert dans Observations HORAIRE (détails complets)
                                await supabase.from('observations_horaire').upsert(records, { onConflict: 'station_id,timestamp' });

                                // Insert aussi dans Observations 6MN (pour compatibilité vues actuelles)
                                // Supabase ignorera les colonnes (rr3, rr6..) qui n'existent pas dans cette table
                                await supabase.from('observations_6mn').upsert(records, { onConflict: 'station_id,timestamp' });

                                insertedCount += records.length;
                            }
                        }
                        fetchedCount++;
                    } catch (err) {
                        // Ignore errors for individual stations
                        // console.warn(`Error fetching ${s.id}`, err);
                    }
                }));
            }

            return new Response(JSON.stringify({
                success: true,
                message: `Cycle terminé. ${fetchedCount} stations interrogées. ${insertedCount} relevés insérés.`,
                duration: (Date.now() - start) / 1000
            }), { headers: { "Content-Type": "application/json" } });

        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
    }
}
