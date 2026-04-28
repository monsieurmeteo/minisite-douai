import { createClient } from '@supabase/supabase-js';
// Node.js has native fetch since version 18

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';
const METEO_TOKEN = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9LHsic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJEb25uZWVzUHVibGlxdWVzUGFxdWV0UmFkYXIiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQUGFxdWV0UmFkYXJcL3YxIiwicHVibGlzaGVyIjoibG9pYy5tYXJ0aW4iLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifV0sImV4cCI6MTc5NTQ1NTk3MCwidG9rZW5fdHlwZSI6ImFwaUtleSIsImlhdCI6MTc2OTE1ODEyMCwianRpIjoiYzhjOWM4ODUtNTkwMi00MDcxLTliMmEtNzYzNjU2NjBlMTczIn0=.GwLM-0qaSCCn1meoV0a_zPE1vqoY-9bD0n951MuytlRfH_qB5udKEnaPZaa24ta7fO45QGwxqikX6do_Y0P-Hzhr3j1Fmtp6SQAt2xGgIQlv5fIf4SR8mv78mJto3J_Kmzccq66NpxFVr_BCZMkwN9STh-78PgVlJ6ympR9yCkHmYG8xBh8u3qvEHE5adCiIZ5su9Wl_ui25JQW0_ncc-lxjrBByp6Pmn1f33fGV6IG4gqs2xrhvh7VUeb_vSuG00JWn-2LFkKmyI-3uRxTqVi8o6xImihaSGkh-R-Xn8ixA4YHdniv2-AAI2AvVng12yXE8M2NPNlpNB_BUcOlt2w==';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function syncVigilance() {
    console.log('--- SYNC VIGILANCE ---');
    try {
        const res = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: { "Authorization": `Bearer ${METEO_TOKEN}` }
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

async function syncObservations() {
    console.log('--- SYNC OBSERVATIONS (Partial) ---');
    // Fetch bulk infrahoraire-6m
    const now = new Date();
    const cycleMinutes = Math.floor(now.getUTCMinutes() / 6) * 6;
    const cycleTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), cycleMinutes, 0, 0));
    cycleTime.setMinutes(cycleTime.getMinutes() - 24); // MF delay
    const tsStr = cycleTime.toISOString().split('.')[0] + 'Z';

    console.log(`  Target Cycle: ${tsStr}`);

    try {
        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${tsStr}&format=json`;
        const res = await fetch(url, { headers: { 'apikey': METEO_TOKEN, 'Authorization': `Bearer ${METEO_TOKEN}` } });
        
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

            // Batch upsert (only first 500 for safety and to reduce Disk IO load)
            const batch = rows.slice(0, 500);
            const { error } = await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
            if (error) console.log('  ❌ Obs Error:', error.message);
            else console.log('  ✅ Obs synced:', batch.length, 'stations from bulk');
        }
    } catch (e) { console.log('  💥 Obs Error:', e.message); }
}

async function run() {
    console.log('🚀 Manual sync starting...\n');
    await syncVigilance();
    await syncObservations();
    console.log('\n🏁 Manual sync completed.');
}

run();
