import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function forceTodayHourly() {
    console.log('🚀 RÉCUPÉRATION HORAIRE DU JOUR (8 Mars 2026)');

    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await resAuth.json();

    const { data: stations } = await supabase.from('stations').select('id');
    const stationIds = stations.map(s => s.id);

    // On teste les heures de 00h à 14h aujourd'hui
    for (let h = 0; h <= 14; h++) {
        const dateStr = `2026-03-08T${h.toString().padStart(2, '0')}:00:00Z`;
        console.log(`📥 Test heure: ${dateStr}`);

        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${dateStr}&format=json`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                const rows = data.filter(obs => stationIds.includes(obs.id || obs.id_station || obs.geo_id_insee)).map(obs => {
                    const sid = obs.id || obs.id_station || obs.geo_id_insee;
                    return {
                        station_id: sid,
                        timestamp: obs.validity_time,
                        t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                        td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                        u: obs.u || null,
                        ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                        fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
                        dd: obs.dd || null,
                        pres: obs.pres || null,
                        rr1: obs.rr1 || 0
                    };
                });
                if (rows.length > 0) {
                    await supabase.from('observations_horaire').upsert(rows, { onConflict: 'station_id, timestamp' });
                    console.log(`   ✅ ${rows.length} enregistrements.`);
                }
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
}

forceTodayHourly();
