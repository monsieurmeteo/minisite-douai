import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

const MF_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const MF_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
    console.log('🔄 Manually catching up step-by-step...');
    
    // 1. Get Token
    const auth = btoa(`${MF_KEY}:${MF_SECRET}`);
    const tokenRes = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await tokenRes.json();

    // 2. Observations (Small Batches)
    console.log('--- SYNC OBSERVATIONS (Micro-batches) ---');
    const now = new Date();
    const cycleMinutes = Math.floor(now.getUTCMinutes() / 6) * 6;
    const cycleTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), cycleMinutes, 0, 0));
    cycleTime.setMinutes(cycleTime.getMinutes() - 18); // Trying 18 min for fresher data
    const tsStr = cycleTime.toISOString().split('.')[0] + 'Z';

    const obsUrl = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${tsStr}&format=json`;
    const obsRes = await fetch(obsUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    
    if (obsRes.ok) {
        const stations = await obsRes.json();
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

        console.log(`  Found ${rows.length} stations. Upserting in 50-row chunks...`);
        for (let i = 0; i < 250 && i < rows.length; i += 50) {
            const batch = rows.slice(i, i + 50);
            const { error } = await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });
            if (error) console.log(`    ❌ Batch ${i}-${i+50} failed: ${error.message}`);
            else console.log(`    ✅ Batch ${i}-${i+50} synced.`);
            await new Promise(r => setTimeout(r, 1000)); // Sleep 1s between chunks to relax Disk IO
        }
    }

    // 3. Vigilance bulletins
    console.log('--- SYNC VIGILANCE BULLETINS ---');
    try {
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (textRes.ok) {
            const textData = await textRes.json();
            let bulletins = [];
            if (textData.product?.text_bloc_items) {
                textData.product.text_bloc_items.forEach((bloc) => {
                    const domainId = bloc.domain_id === 'FRA' ? 'france' : bloc.domain_id;
                    if (bloc.bloc_items) {
                        bloc.bloc_items.forEach((item) => {
                            let content = "";
                            if (item.text_items) {
                                item.text_items.forEach(ti => {
                                    if (ti.bold_text) content += `**${ti.bold_text}**\n`;
                                    if (Array.isArray(ti.text)) content += ti.text.join('\n') + '\n';
                                });
                            }
                            bulletins.push({
                                domain_id: domainId,
                                text_type: item.id,
                                title: item.title || item.type_name || 'Vigilance',
                                content: content.trim(),
                                update_time: textData.product.update_time
                            });
                        });
                    }
                });
            }
            if (bulletins.length > 0) {
                const { error: bErr } = await supabase.from('vigilance_bulletins').upsert(bulletins, { onConflict: 'domain_id, text_type' });
                if (bErr) console.log('  ❌ Bulletin Error:', bErr.message);
                else console.log('  ✅ Bulletins synced:', bulletins.length, 'entries');
            }
        }
    } catch(e) { console.log('  💥 Bulletin error:', e.message); }

    console.log('\n🏁 Manual catch-up task completed.');
}

run();
