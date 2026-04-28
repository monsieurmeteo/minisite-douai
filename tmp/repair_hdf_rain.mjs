import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function repairHdfRain() {
    // 1. Get all stations in HDF bounds roughly or department numbers
    const { data: stations, error: err1 } = await supabase
        .from('stations')
        .select('id, name')
        .or('id.like.59%,id.like.62%,id.like.80%,id.like.60%,id.like.02%');

    if (err1) { console.error('Erreur stations', err1); return; }

    console.log(`Réparation de ${stations.length} stations pour la pluie (Hauts-de-France)...`);

    // We only care about Feb 2026 for now
    for (const st of stations) {
        // Fetch all 6-minute points for the station for February
        const { data: points, error: e1 } = await supabase
            .from('observations_6mn')
            .select('timestamp, rr_per, t, fxi')
            .eq('station_id', st.id)
            .gte('timestamp', '2026-02-01T00:00:00Z')
            .lte('timestamp', '2026-02-28T23:59:59Z');

        if (e1) {
            console.error(`Erreur fetch obs pour ${st.id}`, e1);
            continue;
        }

        if (!points || points.length === 0) continue;

        // Group by day (UTC)
        const daily = {};
        for (const p of points) {
            const dateStr = p.timestamp.substring(0, 10);
            if (!daily[dateStr]) daily[dateStr] = { rain: 0, minT: Infinity, maxT: -Infinity, maxWind: 0 };

            if (p.rr_per !== null && p.rr_per > 0) {
                daily[dateStr].rain += p.rr_per;
            }
            if (p.t !== null) {
                if (p.t < daily[dateStr].minT) daily[dateStr].minT = p.t;
                if (p.t > daily[dateStr].maxT) daily[dateStr].maxT = p.t;
            }
            if (p.fxi !== null) {
                if (p.fxi > daily[dateStr].maxWind) daily[dateStr].maxWind = p.fxi;
            }
        }

        // Update daily_summaries
        for (const [dateStr, agg] of Object.entries(daily)) {
            const summary = {
                station_id: st.id,
                date: dateStr,
                rain_total: Number(agg.rain.toFixed(1))
            };

            if (agg.minT !== Infinity) summary.temp_min = agg.minT;
            if (agg.maxT !== -Infinity) summary.temp_max = agg.maxT;
            if (agg.maxWind > 0) summary.wind_gust_max = agg.maxWind;

            // Only update rain_total if that's the main error, but doing a full upsert fixes everything correctly
            const { error: e2 } = await supabase
                .from('daily_summaries')
                .upsert(summary, { onConflict: 'station_id, date' });

            if (e2) console.error(`Erreur update ${st.id} ${dateStr}`, e2);
        }
        console.log(`Station ${st.id} (${st.name}) réparée : ${Object.keys(daily).length} jours calculés.`);
    }
    console.log('Terminé.');
}
repairHdfRain();
