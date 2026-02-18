import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default {
    async fetch(req: Request) {
        const start = Date.now();
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        try {
            const { data: secrets } = await supabase.from('api_secrets').select('access_token').eq('provider', 'meteo_france').single();
            const token = secrets?.access_token;
            if (!token) throw new Error("Token manquant");

            // 1. Liste des stations
            const listResp = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const textData = await listResp.text();
            let all: any[] = [];
            if (textData.trim().startsWith('[')) { all = JSON.parse(textData); }
            else { all = textData.split('\n').slice(1).map(l => ({ id_station: l.split(';')[0] })).filter(s => s.id_station); }

            // 2. SÉPARATION : HDF en priorité, le reste au hasard
            const hdfPrefixes = ['02', '59', '60', '62', '80'];
            const hdf = all.filter((s: any) => hdfPrefixes.some(p => s.id_station.startsWith(p)));
            const others = all.filter((s: any) => !hdfPrefixes.some(p => s.id_station.startsWith(p)));
            others.sort(() => Math.random() - 0.5);

            const queue = [...hdf, ...others];
            console.log(`🚀 Scan de ${queue.length} stations. Priorité HDF (${hdf.length} stations).`);

            let count = 0;
            const PARALLEL = 25;

            for (let i = 0; i < queue.length; i += PARALLEL) {
                if (Date.now() - start > 52000) break;

                const batch = queue.slice(i, i + PARALLEL);
                const results = await Promise.all(batch.map(async (s: any) => {
                    try {
                        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${s.id_station}&format=json`;
                        const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (!r.ok) return null;
                        const data = await r.json();
                        const it = Array.isArray(data) ? data[0] : data;
                        if (!it) return null;
                        return {
                            station_id: s.id_station,
                            timestamp: new Date(it.validity_time || it.date_obs).toISOString(),
                            t: it.t !== null ? Math.round((it.t - 273.15) * 10) / 10 : null,
                            ff: it.ff !== null ? Math.round(it.ff * 3.6) : null,
                            fxi: it.fxi !== null ? Math.round(it.fxi * 3.6) : null,
                            dd: it.dd, // AJOUTÉ : Direction du vent
                            rr_per: it.rr_per || 0,
                            u: it.u,
                            pres: it.pres
                        };
                    } catch { return null; }
                }));

                const rows = results.filter(r => r !== null);
                if (rows.length > 0) {
                    await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
                    await supabase.from('observations_horaire').upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
                    count += rows.length;
                }
            }

            return new Response(JSON.stringify({ success: true, points: count }), { headers: { "Content-Type": "application/json" } });
        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }
}
