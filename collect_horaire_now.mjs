import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function collectHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    console.log('📊 COLLECTE DES DONNÉES HORAIRES RÉCENTES\n');

    const now = new Date();
    const hoursToTest = [];

    // Test last 6 hours
    for (let i = 1; i <= 6; i++) {
        const hourTime = new Date(now);
        hourTime.setUTCMinutes(0, 0, 0);
        hourTime.setUTCHours(hourTime.getUTCHours() - i);
        hoursToTest.push(hourTime);
    }

    let totalInserted = 0;

    for (const hourTime of hoursToTest) {
        const hourTimeStr = hourTime.toISOString().split('.')[0] + 'Z';
        const frenchHour = hourTime.getHours() + 1;

        process.stdout.write(`${hourTimeStr} (${frenchHour}h française) ... `);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${hourTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) {
                console.log(`❌ HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();

            const rows = data.map(obs => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: new Date(obs.validity_time || hourTimeStr).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pres || null,
                rr1: obs.rr1 || 0,
                rr3: obs.rr3 || 0,
                rr6: obs.rr6 || 0,
                rr12: obs.rr12 || 0,
                rr24: obs.rr24 || 0,
                vv: obs.vv || null
            })).filter(r => r.station_id);

            const BATCH_SIZE = 100;
            let inserted = 0;
            for (let j = 0; j < rows.length; j += BATCH_SIZE) {
                const batch = rows.slice(j, j + BATCH_SIZE);
                const { error } = await supabase
                    .from('observations_horaire')
                    .upsert(batch, { onConflict: 'station_id, timestamp' });

                if (!error) inserted += batch.length;
            }

            totalInserted += inserted;
            console.log(`✅ ${data.length} stations, ${inserted} insérés`);

        } catch (error) {
            console.log(`❌ ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 Total inséré: ${totalInserted} enregistrements`);

    // Final check
    const { data: latest } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { count } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Dernier relevé: ${latest?.[0]?.timestamp}`);
    console.log(`📊 Total en base: ${count} enregistrements`);
}

collectHoraire();
