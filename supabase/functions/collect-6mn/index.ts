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

        console.log("🚀 START: Smart Update 6mn (Rolling 72m)");

        // 1. Get Token
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        let token = secrets?.access_token;

        // Function call API (Bulk)
        const callApiBulk = async (dateStr: string, currentToken: string) => {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
            return await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        };

        // Function call API (Individual - for missing stations like Steenvoorde)
        const callApiIndividual = async (stationId: string, dateStr: string, currentToken: string) => {
            const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${stationId}&date=${dateStr}&format=json`;
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

        // 2. Determine Rolling Lookback Slots (72 minutes window)
        // We always fetch the last 12 slots to catch delayed or missing stations
        const now = new Date();
        const startPoint = new Date(Math.floor(now.getTime() / 360000) * 360000 - 72 * 60000);
        const limitDate = new Date(now.getTime() - 2 * 60000);

        const slotsToFetch: Date[] = [];
        let reader = new Date(startPoint);

        while (reader <= limitDate) {
            reader.setMinutes(Math.floor(reader.getMinutes() / 6) * 6, 0, 0);
            slotsToFetch.push(new Date(reader));
            reader = new Date(reader.getTime() + 6 * 60000);
            if (slotsToFetch.length >= 12) break;
        }

        if (slotsToFetch.length === 0) {
            console.log("✅ Up to date.");
            return new Response(JSON.stringify({ status: "Up to date" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`📥 Fetching ${slotsToFetch.length} rolling slots: ${slotsToFetch.map(d => d.toISOString()).join(', ')}`);

        // Get the list of stations we want to supervise from DB
        const { data: dbStationsData, error: dbError } = await supabase.from('stations').select('id');
        const TARGET_STATIONS: string[] = (dbStationsData || []).map((s: any) => s.id);

        if (dbError) console.error('⚠️ Could not fetch stations from DB:', dbError.message);

        let totalInserted = 0;

        for (const slot of slotsToFetch) {
            const dateStr = slot.toISOString().split('.')[0] + 'Z';
            let allBatchData: any[] = [];
            let bulkStationsIds = new Set();

            // 1. Appel Bulk
            let res = await callApiBulk(dateStr, token);
            if (res.status === 401) {
                token = await refreshToken();
                res = await callApiBulk(dateStr, token);
            }

            if (res.ok) {
                const bulkData = await res.json();
                if (Array.isArray(bulkData)) {
                    allBatchData = [...bulkData];
                    bulkData.forEach(obs => {
                        const sid = obs.id || obs.id_station || obs.geo_id_insee;
                        if (sid) bulkStationsIds.add(sid);
                    });
                }
            }

            // 2. Identify missing stations ( those in TARGET_STATIONS but not in Bulk )
            const missingFromBulk = TARGET_STATIONS.filter(sid => !bulkStationsIds.has(sid));

            if (missingFromBulk.includes('35281001')) {
                console.log(`🔍 RENNES (35281001) is missing from Bulk for ${dateStr}. Attempting individual fetch...`);
            }

            // 3. Appels Individuels (pour les stations vraiment manquantes)
            if (missingFromBulk.length > 0) {
                for (const sid of missingFromBulk) {
                    try {
                        let resIndiv = await callApiIndividual(sid, dateStr, token);
                        if (resIndiv.status === 401) {
                            token = await refreshToken();
                            resIndiv = await callApiIndividual(sid, dateStr, token);
                        }
                        if (resIndiv.ok) {
                            const indivData = await resIndiv.json();
                            if (Array.isArray(indivData) && indivData[0]) {
                                if (sid === '35281001') console.log(`✅ RENNES data found via indiv fetch for ${dateStr}`);
                                allBatchData.push({ ...indivData[0], _source: 'indiv' });
                            } else {
                                if (sid === '35281001') console.log(`⚠️ RENNES indiv fetch returned empty/invalid data for ${dateStr}`);
                            }
                        } else {
                            if (sid === '35281001') console.log(`❌ RENNES indiv fetch failed (status ${resIndiv.status}) for ${dateStr}`);
                        }
                    } catch (e) {
                        console.log(`❌ Error fetching indiv station ${sid}:`, (e as any).message);
                    }
                    // Petit délai pour éviter 429
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            if (allBatchData.length === 0) continue;

            const rows = allBatchData.map((obs: any) => {
                const stationId = obs.id || obs.id_station || obs.geo_id_insee;
                return {
                    station_id: stationId,
                    timestamp: new Date(obs.validity_time || dateStr).toISOString(),
                    t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u != null ? obs.u : null,
                    ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                    fxi: obs.fxi10 != null ? Math.round(obs.fxi10 * 3.6) : (obs.fxi != null ? Math.round(obs.fxi * 3.6) : null),
                    dd: obs.dd != null ? obs.dd : null,
                    pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                    rr_per: obs.rr_per != null ? obs.rr_per : 0
                };
            }).filter((r: any) => r.station_id);

            const { error: upsertError } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp' });
            if (!upsertError) {
                totalInserted += rows.length;
                console.log(`✅ ${rows.length} inserted for ${dateStr}`);
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: slotsToFetch.length, inserted: totalInserted }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ FATAL:', error);
        return new Response(
            JSON.stringify({ error: (error as any).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
