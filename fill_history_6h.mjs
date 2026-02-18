import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function fillHistoricalData() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Get token
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) {
        console.error('❌ Token non trouvé');
        return;
    }

    console.log('🕐 Collecte des 6 dernières heures...\n');

    // 2. Generate all 6-minute cycles for the last 6 hours
    const now = new Date();
    const cycles = [];

    for (let i = 0; i < 60; i++) { // 60 cycles = 6 heures
        const cycleTime = new Date(now);
        cycleTime.setMinutes(Math.floor(cycleTime.getMinutes() / 6) * 6, 0, 0);
        cycleTime.setMinutes(cycleTime.getMinutes() - (i * 6) - 30); // 30 min delay
        cycles.push(cycleTime);
    }

    console.log(`📊 ${cycles.length} cycles à collecter`);
    console.log(`   Du ${cycles[cycles.length - 1].toISOString()} au ${cycles[0].toISOString()}\n`);

    let totalInserted = 0;
    let successCount = 0;

    // 3. Collect each cycle
    for (let i = 0; i < cycles.length; i++) {
        const cycleTime = cycles[i];
        const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

        process.stdout.write(`[${i + 1}/${cycles.length}] ${cycleTimeStr} ... `);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) {
                console.log(`⚠️  API error ${res.status}`);
                continue;
            }

            const data = await res.json();

            const rows = data.map(obs => {
                const sid = obs.id || obs.id_station || obs.geo_id_insee;
                return {
                    station_id: sid,
                    timestamp: new Date(obs.validity_time || cycleTimeStr).toISOString(),
                    t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u || null,
                    ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                    fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                    dd: obs.dd || null,
                    pres: obs.pres || null,
                    rr_per: obs.rr_per || 0
                };
            }).filter(r => r.station_id);

            const uniqueRows = Array.from(
                new Map(rows.map(r => [`${r.station_id}_${r.timestamp}`, r])).values()
            );

            // Insert in batches
            const BATCH_SIZE = 100;
            let inserted = 0;
            for (let j = 0; j < uniqueRows.length; j += BATCH_SIZE) {
                const batch = uniqueRows.slice(j, j + BATCH_SIZE);
                const { error } = await supabase
                    .from('observations_6mn')
                    .upsert(batch, { onConflict: 'station_id, timestamp' });

                if (!error) {
                    inserted += batch.length;
                }
            }

            totalInserted += inserted;
            successCount++;
            console.log(`✅ ${data.length} stations, ${inserted} insérés`);

        } catch (error) {
            console.log(`❌ ${error.message}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 TERMINÉ !`);
    console.log(`   Cycles réussis: ${successCount}/${cycles.length}`);
    console.log(`   Total inséré: ${totalInserted} enregistrements`);
    console.log('='.repeat(60));

    // Final check
    const { count } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total dans la base: ${count} enregistrements`);
}

fillHistoricalData();
