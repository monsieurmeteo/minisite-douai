import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function scanLastHours() {
    console.log('--- RECHERCHE DU DERNIER PAQUET MF DISPONIBLE ---');

    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await resAuth.json();

    const now = new Date();
    // Tester les 10dernières périodes de 6mn
    for (let i = 2; i < 15; i++) {
        const target = new Date(Math.floor(now.getTime() / 360000) * 360000 - i * 360000);
        const dateStr = target.toISOString().split('.')[0] + 'Z';
        console.log(`🔍 Test ${dateStr}...`);

        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                console.log(`✅ TROUVÉ ! ${data.length} obs.`);

                const { data: stations } = await supabase.from('stations').select('id');
                const stationIds = new Set(stations.map(s => s.id));

                const rows = data.filter(obs => stationIds.has(obs.id || obs.id_station || obs.geo_id_insee)).map(obs => {
                    const sid = obs.id || obs.id_station || obs.geo_id_insee;
                    return {
                        station_id: sid,
                        timestamp: target.toISOString(),
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
                    await supabase.from('observations_6mn').upsert(rows);
                    console.log(`🚀 ${rows.length} stations mises à jour sur le site.`);
                    return; // On a débloqué le site avec le plus récent disponible.
                }
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
}

scanLastHours();
