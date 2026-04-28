import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function refreshToken() {
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();
    return data.access_token;
}

const k2c = (k) => (k !== null && k !== undefined) ? Math.round((k - 273.15) * 10) / 10 : null;
const ms2kmh = (ms) => (ms !== null && ms !== undefined) ? Math.round(ms * 3.6) : null;

async function globalBackfill() {
    console.log('--- 🚀 START GLOBAL BACKFILL (March 4th - 7th) ---');
    try {
        let token = await refreshToken();

        let current = new Date('2026-03-04T00:00:00Z');
        const endDate = new Date('2026-03-08T00:00:00Z');

        while (current <= endDate) {
            const dateStr = current.toISOString().split('.')[0] + 'Z';
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;

            try {
                let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

                if (res.status === 401) {
                    token = await refreshToken();
                    res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                }

                if (res.status === 429) {
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }

                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json) && json.length > 0) {
                        const rows = json.map(obs => {
                            const stationId = obs.geo_id_insee || obs.id_station || obs.id;
                            return {
                                station_id: stationId,
                                timestamp: obs.validity_time || obs.date_obs || dateStr,
                                t: k2c(obs.t),
                                td: k2c(obs.td),
                                u: obs.u,
                                dd: obs.dd,
                                ff: ms2kmh(obs.ff),
                                fxi: ms2kmh(obs.fxi10 || obs.fxi),
                                pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                                rr_per: obs.rr_per != null ? obs.rr_per : 0
                            };
                        }).filter(r => r.station_id);

                        if (rows.length > 0) {
                            for (let i = 0; i < rows.length; i += 500) {
                                const chunk = rows.slice(i, i + 500);
                                await supabase.from('observations_6mn').upsert(chunk, { onConflict: 'station_id, timestamp' });
                            }
                            process.stdout.write(`✅ ${dateStr}: ${rows.length} records \r`);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error at ${dateStr}:`, err.message);
            }

            current = new Date(current.getTime() + 6 * 60000);
            await new Promise(r => setTimeout(r, 500));
        }
        console.log('\n--- ✨ GLOBAL BACKFILL COMPLETE ---');
    } catch (e) {
        console.error('FATAL:', e.message);
    }
}

globalBackfill();
