import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function quickUpdate() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

    console.log('🔍 Recherche du cycle le plus récent disponible...\n');

    const now = new Date();

    // Try different delays to find what's available
    for (let delayMinutes = 20; delayMinutes <= 60; delayMinutes += 6) {
        const testTime = new Date(now);
        testTime.setMinutes(Math.floor(testTime.getMinutes() / 6) * 6, 0, 0);
        testTime.setMinutes(testTime.getMinutes() - delayMinutes);
        const testTimeStr = testTime.toISOString().split('.')[0] + 'Z';

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${testTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                console.log(`✅ Trouvé! Cycle: ${testTimeStr} (${data.length} stations)`);
                console.log(`   Délai nécessaire: ${delayMinutes} minutes\n`);

                // Insert this data
                const rows = data.map(obs => ({
                    station_id: obs.id || obs.id_station || obs.geo_id_insee,
                    timestamp: new Date(obs.validity_time || testTimeStr).toISOString(),
                    t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u || null,
                    ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                    fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                    dd: obs.dd || null,
                    pres: obs.pres || null,
                    rr_per: obs.rr_per || 0
                })).filter(r => r.station_id);

                console.log('💾 Insertion en cours...');
                const BATCH_SIZE = 100;
                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);
                    await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp' });
                    process.stdout.write('.');
                }

                console.log(`\n✅ ${rows.length} enregistrements insérés!`);
                break;
            }
        } catch (e) {
            // Continue trying
        }
    }

    // Check final state
    const { data: latest } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    console.log(`\n📊 Dernier relevé dans la base: ${latest?.[0]?.timestamp}`);
    console.log(`🕐 Heure actuelle: ${now.toISOString()}`);
}

quickUpdate();
