import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function forceUpdateHourly() {
    console.log('🚀 FORCE UPDATE HOURLY: Synchronisation des dernières 24h...');

    // 1. Token MF
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await resAuth.json();
    console.log('✅ Token MF obtenu');

    // 2. Récupérer les stations
    const { data: stations } = await supabase.from('stations').select('id');
    const stationIds = stations.map(s => s.id);

    // 3. Collecter les 6 dernières heures (une par une)
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const slot = new Date(now.getTime() - i * 3600000);
        slot.setMinutes(0, 0, 0);
        const dateStr = slot.toISOString().split('.')[0] + 'Z';
        console.log(`📥 Collecte Horaire ${dateStr}...`);

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
                    const { error } = await supabase.from('observations_horaire').upsert(rows, { onConflict: 'station_id, timestamp' });
                    if (!error) console.log(`   ✅ ${rows.length} relevés horaires insérés`);
                    else console.error(`   ❌ Erreur DB: ${error.message}`);
                }
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('✅ FIN DE LA MISE À JOUR HORAIRE');
}

forceUpdateHourly();
