import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

// Météo-France Credentials
const MF_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const MF_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function getMFToken() {
    console.log('🔄 Refreshing Météo-France Token...');
    const auth = btoa(`${MF_KEY}:${MF_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 
            'Authorization': `Basic ${auth}`, 
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed: ' + res.status);
    const data = await res.json();
    return data.access_token;
}

async function syncVigilance(token) {
    console.log('--- SYNC VIGILANCE ---');
    try {
        const res = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('MF API Error: ' + res.status);
        const mapData = await res.json();
        
        let allUpsertData = [];
        if (mapData?.product?.periods) {
            mapData.product.periods.forEach((period, idx) => {
                if (!period.timelaps?.domain_ids) return;
                const upsertData = period.timelaps.domain_ids.map(d => ({
                    dep_code: d.domain_id,
                    period: idx,
                    level: d.max_color_id,
                    start_time: period.begin_validity_time,
                    end_time: period.end_validity_time,
                    risks: d.phenomenon_items?.map(p => ({
                        id: p.phenomenon_id,
                        level: p.phenomenon_max_color_id,
                        timelines: p.timelaps_items
                    })) || [],
                    last_update: new Date().toISOString()
                }));
                allUpsertData.push(...upsertData);
            });
        }

        if (allUpsertData.length > 0) {
            const { error } = await supabase.from('vigilance_status').upsert(allUpsertData, { onConflict: 'dep_code, period' });
            if (error) console.log('  ❌ Vigilance Status Error:', error.message);
            else console.log('  ✅ Vigilance Status synced:', allUpsertData.length, 'rows');
        }
    } catch (e) { console.log('  💥 Vigilance Error:', e.message); }
}

async function syncObservations(token) {
    console.log('--- SYNC OBSERVATIONS (Partial) ---');
    const now = new Date();
    const cycleMinutes = Math.floor(now.getUTCMinutes() / 6) * 6;
    const cycleTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), cycleMinutes, 0, 0));
    cycleTime.setMinutes(cycleTime.getMinutes() - 24); // MF delay
    const tsStr = cycleTime.toISOString().split('.')[0] + 'Z';

    console.log(`  Target Cycle: ${tsStr}`);

    try {
        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${tsStr}&format=json`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!res.ok) throw new Error('MF API Obs Error: ' + res.status);
        const stations = await res.json();
        
        if (Array.isArray(stations) && stations.length > 0) {
            const rows = stations.map(obs => ({
                station_id: obs.geo_id_insee || obs.id,
                timestamp: obs.validity_time || tsStr,
                t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u ?? null,
                ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                rr_per: obs.rr_per ?? 0,
                pres: obs.pres ?? null,
                fxi: obs.fxi10 != null ? Math.round(obs.fxi10 * 3.6) : (obs.fxi != null ? Math.round(obs.fxi * 3.6) : null),
                dd: obs.dd ?? null,
                vv: obs.vv ?? null
            })).filter(r => r.station_id);

            const batch = rows.slice(0, 800); // 800 is a safe batch size
            const { error } = await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
            if (error) console.log('  ❌ Obs Error:', error.message);
            else console.log('  ✅ Obs synced:', batch.length, 'stations');
        }
    } catch (e) { console.log('  💥 Obs Error:', e.message); }
}

async function run() {
    console.log('🚀 Manual catch-up starting...\n');
    try {
        const token = await getMFToken();
        await syncVigilance(token);
        await syncObservations(token);
    } catch (e) {
        console.log('❌ Global Error:', e.message);
    }
    console.log('\n🏁 Manual catch-up completed.');
}

run();
