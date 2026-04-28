import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function refreshToken() {
    process.stdout.write('🔄 Token refresh... ');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();
    process.stdout.write('OK\n');
    return data.access_token;
}

const k2c = (k) => (k !== null && k !== undefined) ? Math.round((k - 273.15) * 10) / 10 : null;
const ms2kmh = (ms) => (ms !== null && ms !== undefined) ? Math.round(ms * 3.6) : null;

async function backfill() {
    console.log('--- 🚀 START BACKFILL 6mn (From March 1st) ---');
    try {
        let token = await refreshToken();

        // Target range: March 1st 00:00 to March 8th 17:30
        const startDate = new Date('2026-03-01T00:00:00Z');
        const endDate = new Date('2026-03-08T18:00:00Z');

        // We start from the oldest to "save" it before it rotates out of MF API (7-day window)
        let current = new Date(startDate);
        current.setMinutes(0, 0, 0);

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
                    process.stdout.write(`\n⏳ Rate limit (429) at ${dateStr}. Waiting 15s...`);
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
                            // Upsert in batches of 1000 to be safe
                            for (let i = 0; i < rows.length; i += 1000) {
                                const chunk = rows.slice(i, i + 1000);
                                const { error } = await supabase.from('observations_6mn').upsert(chunk, { onConflict: 'station_id, timestamp' });
                                if (error) {
                                    console.error(`\n❌ DB Error at ${dateStr} (chunk ${i}):`, error.message);
                                }
                            }
                            process.stdout.write(`✅ ${dateStr}: ${rows.length} records. \r`);
                        }
                    } else {
                        process.stdout.write(`⚠️ ${dateStr}: No data. \r`);
                    }
                } else if (res.status === 404) {
                    process.stdout.write(`❌ ${dateStr}: Not found (404). \r`);
                } else {
                    process.stdout.write(`❌ ${dateStr}: Error ${res.status}. \r`);
                }
            } catch (err) {
                console.error(`\n❌ Fetch Error at ${dateStr}:`, err.message);
            }

            // Next 6-minute slot
            current = new Date(current.getTime() + 6 * 60000);
            // Throttle slightly to respect API limits
            await new Promise(r => setTimeout(r, 300));
        }

        console.log('\n--- ✨ BACKFILL COMPLETE ---');
    } catch (e) {
        console.error('❌ FATAL:', e.message);
    }
}

backfill();
