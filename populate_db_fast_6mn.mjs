
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

function getLatestCycleTime() {
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;
    const cycleTime = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        roundedMinutes,
        0,
        0
    ));
    cycleTime.setMinutes(cycleTime.getMinutes() - 30);
    return cycleTime.toISOString().split('.')[0] + 'Z';
}

async function populateFast6mn() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) return;

    const cycleTime = getLatestCycleTime();
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTime}&format=json`;

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;

    const data = await res.json();
    console.log(`✅ ${data.length} stations reçues.`);

    const rows = data.map(obs => {
        const sid = obs.id || obs.id_station || obs.geo_id_insee;
        return {
            station_id: sid,
            timestamp: new Date(obs.validity_time || cycleTime).toISOString(),
            t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
            td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
            u: obs.u,
            ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
            pres: obs.pres,
            fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
            dd: obs.dd
        };
    }).filter(r => r.station_id);

    // Filter out rows that might lack a timestamp or be duplicates for this batch
    const uniqueRows = Array.from(new Map(rows.map(r => [`${r.station_id}_${r.timestamp}`, r])).values());

    console.log(`💾 Sauvegarde de ${uniqueRows.length} lignes dans observations_6mn...`);

    // Note: We need service_role for this table based on RLS, but let's try with Anon key in case it's actually open
    const BATCH_SIZE = 100;
    for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
        const batch = uniqueRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('observations_6mn')
            .upsert(batch, { onConflict: 'station_id, timestamp' });

        if (error) {
            console.error(`❌ Erreur lot ${Math.floor(i / BATCH_SIZE)} :`, error.message);
        } else {
            process.stdout.write(".");
        }
    }

    console.log("\n🎉 Terminé !");
}

populateFast6mn();
