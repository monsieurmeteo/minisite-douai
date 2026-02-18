import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function updateLatest() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get token
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

    console.log('🔄 Mise à jour depuis l\'API Météo-France...\n');

    // Get last timestamp in DB
    const { data: lastRecord } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const lastTimestamp = lastRecord?.[0]?.timestamp;
    console.log(`📊 Dernier relevé en base: ${lastTimestamp}`);

    // Collect from last timestamp to now
    const now = new Date();
    const cycles = [];

    // Generate cycles from 30 min ago to 3 hours ago
    for (let i = 5; i < 30; i++) {
        const cycleTime = new Date(now);
        cycleTime.setMinutes(Math.floor(cycleTime.getMinutes() / 6) * 6, 0, 0);
        cycleTime.setMinutes(cycleTime.getMinutes() - (i * 6));
        cycles.push(cycleTime);
    }

    console.log(`🔍 Collecte de ${cycles.length} cycles...\n`);

    let totalInserted = 0;
    let successCount = 0;

    for (let i = 0; i < cycles.length; i++) {
        const cycleTime = cycles[i];
        const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

        process.stdout.write(`[${(i + 1).toString().padStart(2)}/${cycles.length}] ${cycleTimeStr} ... `);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) {
                console.log(`⚠️  HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();

            const rows = data.map(obs => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: new Date(obs.validity_time || cycleTimeStr).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pres || null,
                rr_per: obs.rr_per || 0
            })).filter(r => r.station_id);

            const BATCH_SIZE = 100;
            let inserted = 0;
            for (let j = 0; j < rows.length; j += BATCH_SIZE) {
                const batch = rows.slice(j, j + BATCH_SIZE);
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

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n' + '='.repeat(70));
    console.log(`🎉 MISE À JOUR TERMINÉE`);
    console.log(`   Cycles réussis: ${successCount}/${cycles.length}`);
    console.log(`   Total inséré: ${totalInserted} enregistrements`);
    console.log('='.repeat(70));

    // Final check
    const { data: newLast } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { count } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 État final:`);
    console.log(`   Dernier relevé: ${newLast?.[0]?.timestamp}`);
    console.log(`   Total en base: ${count} enregistrements`);
    console.log(`   Heure actuelle: ${now.toISOString()}`);

    const lastDate = new Date(newLast?.[0]?.timestamp);
    const delay = Math.round((now - lastDate) / 60000);
    console.log(`   Retard: ~${delay} minutes`);
}

updateLatest();
