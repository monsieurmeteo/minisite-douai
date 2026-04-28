import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function refreshToken() {
    console.log('🔄 Refreshing Token...');
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();
    await supabase.from('api_secrets').upsert({ provider: 'meteo_france', access_token: data.access_token, updated_at: new Date().toISOString() });
    return data.access_token;
}

async function check() {
    try {
        console.log("🚀 START: Manual Update 6mn");
        const { data: secrets } = await supabase.from('api_secrets').select('access_token').eq('provider', 'meteo_france').single();
        let token = secrets?.access_token;
        if (!token) token = await refreshToken();

        const now = new Date();
        const startPoint = new Date(Math.floor(now.getTime() / 360000) * 360000 - 72 * 60000);
        const limitDate = new Date(now.getTime() - 2 * 60000);

        const slotsToFetch = [];
        let reader = new Date(startPoint);
        while (reader <= limitDate) {
            reader.setMinutes(Math.floor(reader.getMinutes() / 6) * 6, 0, 0);
            slotsToFetch.push(new Date(reader));
            reader = new Date(reader.getTime() + 6 * 60000);
            if (slotsToFetch.length >= 12) break;
        }

        console.log(`📥 Fetching ${slotsToFetch.length} slots...`);

        for (const slot of slotsToFetch) {
            const dateStr = slot.toISOString().split('.')[0] + 'Z';
            console.log(`Processing slot ${dateStr}...`);
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
            let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.status === 401) {
                token = await refreshToken();
                res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            }

            if (res.ok) {
                const bulkData = await res.json();
                console.log(`Slot ${dateStr}: Found ${bulkData ? bulkData.length : 0} stations`);
                if (bulkData && bulkData.length > 0) {
                    const rows = bulkData.map(obs => {
                        const stationId = obs.id || obs.id_station || obs.geo_id_insee;
                        return {
                            station_id: stationId,
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
                    }).filter(r => r.station_id);

                    const { error } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp' });
                    if (error) console.error(`Error inserting slot ${dateStr}:`, error.message);
                    else console.log(`Successfully inserted ${rows.length} rows for ${dateStr}`);
                }
            } else {
                console.log(`Error for slot ${dateStr}: ${res.status}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

check();
