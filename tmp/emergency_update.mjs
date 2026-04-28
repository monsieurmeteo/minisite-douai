import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function forceUpdate() {
    console.log('🚀 FORCE UPDATE: Re-synchronisation manuelle...');

    // 1. Obtenir un token MF
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await resAuth.json();
    console.log('✅ Token MF obtenu');

    // 2. Récupérer les stations cibles
    const { data: stations } = await supabase.from('stations').select('id');
    const stationIds = stations.map(s => s.id);

    // 3. Collecter les dernières 60 minutes (10 slots de 6mn)
    const now = new Date();
    for (let i = 0; i < 10; i++) {
        const slot = new Date(Math.floor(now.getTime() / 360000) * 360000 - i * 360000);
        const dateStr = slot.toISOString().split('.')[0] + 'Z';
        console.log(`📥 Collecte slot ${dateStr}...`);

        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                const rows = data.filter(obs => stationIds.includes(obs.id || obs.id_station || obs.geo_id_insee)).map(obs => {
                    const sid = obs.id || obs.id_station || obs.geo_id_insee;
                    return {
                        station_id: sid,
                        timestamp: new Date(obs.validity_time || dateStr).toISOString(),
                        t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                        td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                        u: obs.u != null ? obs.u : null,
                        ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                        fxi: obs.fxi10 != null ? Math.round(obs.fxi10 * 3.6) : (obs.fxi != null ? Math.round(obs.fxi * 3.6) : null),
                        dd: obs.dd != null ? obs.dd : null,
                        pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                        rr_per: obs.rr_per != null ? obs.rr_per : 0
                    };
                });

                if (rows.length > 0) {
                    const { error } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp' });
                    if (!error) console.log(`   ✅ ${rows.length} relevés insérés`);
                    else console.error(`   ❌ Erreur DB: ${error.message}`);
                }
            }
        } else {
            console.log(`   ⚠️ Erreur API ${res.status} pour ${dateStr}`);
        }
        // Pause pour l'API
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('✅ FIN DE LA MISE À JOUR DE SECOURS');
}

forceUpdate();
