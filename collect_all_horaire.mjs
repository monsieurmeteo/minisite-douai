import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function collectAllHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    console.log('🔄 COLLECTE COMPLÈTE DES DONNÉES HORAIRES\n');

    const hours = [
        '2026-01-19T14:00:00Z', // 15h française
        '2026-01-19T13:00:00Z', // 14h française
        '2026-01-19T12:00:00Z', // 13h française
        '2026-01-19T11:00:00Z', // 12h française
        '2026-01-19T10:00:00Z', // 11h française
        '2026-01-19T09:00:00Z', // 10h française
    ];

    let totalInserted = 0;

    for (const hourTime of hours) {
        const frenchHour = new Date(hourTime).getHours() + 1;
        process.stdout.write(`${hourTime} (${frenchHour}h française) ... `);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${hourTime}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) {
                console.log(`❌ HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();

            const rows = data.map(obs => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: obs.validity_time,
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pres || null,
                rr1: obs.rr1 || 0
            })).filter(r => r.station_id);

            const BATCH_SIZE = 100;
            let inserted = 0;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const { data: result, error } = await supabase
                    .from('observations_horaire')
                    .upsert(batch, { onConflict: 'station_id, timestamp' })
                    .select();

                if (!error) inserted += (result?.length || 0);
            }

            totalInserted += inserted;
            console.log(`✅ ${data.length} stations, ${inserted} insérés`);

        } catch (error) {
            console.log(`❌ ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 Total inséré: ${totalInserted} enregistrements`);

    // Final status
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

collectAllHoraire();
