import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function reinitLive() {
    console.log('🔄 RÉAMORÇAGE DU LIVE (dernière heure)...');

    // 1. Token MF
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const { access_token: token } = await resAuth.json();

    // 2. On prend les 10dernières minutes précises
    // MF publie souvent avec 15-20min de retard
    const now = new Date();
    const targetTime = new Date(Math.floor(now.getTime() / 360000) * 360000 - 1200000); // Il y a 20 min
    const dateStr = targetTime.toISOString().split('.')[0] + 'Z';

    console.log(`📥 Tentative pour le slot : ${dateStr}`);

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

    if (res.ok) {
        const data = await res.json();
        console.log(`📦 Reçu ${data.length} observations de l'API.`);

        // Filtrer pour vos stations (on prend les ID existants en base)
        const { data: stations } = await supabase.from('stations').select('id');
        const stationIds = new Set(stations.map(s => s.id));

        const rows = data.filter(obs => {
            const sid = obs.id || obs.id_station || obs.geo_id_insee;
            return stationIds.has(sid);
        }).map(obs => {
            const sid = obs.id || obs.id_station || obs.geo_id_insee;
            return {
                station_id: sid,
                timestamp: targetTime.toISOString(),
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
            const { error } = await supabase.from('observations_6mn').upsert(rows);
            if (!error) console.log(`✅ ${rows.length} stations mises à jour pour ${dateStr}`);
            else console.error('❌ Erreur Upsert:', error.message);
        } else {
            console.log('⚠️ Aucune de vos stations n\'est présente dans ce paquet MF.');
        }
    } else {
        console.error(`❌ Erreur API MF: ${res.status}`);
    }
}

reinitLive();
