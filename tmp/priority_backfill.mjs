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

async function priorityBackfill() {
    console.log('--- 🚀 START PRIORITY BACKFILL (March 1st - 3rd) ---');
    try {
        let token = await refreshToken();
        const priorityStations = ['59178001', '59350001', '59343001', '75114001', '62160001']; // Douai, Lille, Lesquin, Paris, Boulogne

        let current = new Date('2026-03-01T00:00:00Z');
        const endDate = new Date('2026-03-04T00:00:00Z');

        while (current <= endDate) {
            const dateStr = current.toISOString().split('.')[0] + 'Z';

            for (const sid of priorityStations) {
                try {
                    const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${sid}&date=${dateStr}&format=json`;
                    let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

                    if (res.status === 401) {
                        token = await refreshToken();
                        res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                    }

                    if (res.status === 429) {
                        await new Promise(r => setTimeout(r, 10000));
                        continue;
                    }

                    if (res.ok) {
                        const json = await res.json();
                        if (Array.isArray(json) && json[0]) {
                            const obs = json[0];
                            const row = {
                                station_id: sid,
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
                            await supabase.from('observations_6mn').upsert(row, { onConflict: 'station_id, timestamp' });
                            process.stdout.write(`✅ ${dateStr} - ${sid} \r`);
                        }
                    }
                } catch (e) {
                    console.error(`Error for ${sid} at ${dateStr}:`, e.message);
                }
                await new Promise(r => setTimeout(r, 200));
            }
            current = new Date(current.getTime() + 6 * 60000);
        }
        console.log('\n--- ✨ PRIORITY BACKFILL COMPLETE ---');
    } catch (e) {
        console.error('FATAL:', e.message);
    }
}

priorityBackfill();
