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

// Kelvin to Celsius
const k2c = (k) => (k !== null && k !== undefined) ? Math.round((k - 273.15) * 10) / 10 : null;
const ms2kmh = (ms) => (ms !== null && ms !== undefined) ? Math.round(ms * 3.6) : null;

async function catchup() {
    console.log('--- 🚀 START CATCHUP V2 (Fixed Mapping) ---');
    try {
        const { data: stations } = await supabase.from('stations').select('id');
        const validIds = new Set(stations?.map(s => s.id) || []);
        console.log(`📡 Ready to sync ${validIds.size} stations.`);

        let token = await refreshToken();

        // 7 days ago (MF API limit) back to March 1st
        const startDate = new Date('2026-03-01T00:00:00Z');
        let current = new Date();
        current.setMinutes(Math.floor(current.getMinutes() / 6) * 6, 0, 0);

        while (current >= startDate) {
            const dateStr = current.toISOString().split('.')[0] + 'Z';
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;

            try {
                let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

                if (res.status === 401) {
                    token = await refreshToken();
                    res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                }

                if (res.status === 429) {
                    process.stdout.write(`\n⏳ Rate limit (429) at ${dateStr}. Waiting 10s...`);
                    await new Promise(r => setTimeout(r, 10000));
                    continue;
                }

                if (res.ok) {
                    const json = await res.json();

                    // Filter and Map
                    const rowBatch = json
                        .filter(obs => validIds.has(obs.id_station))
                        .map(obs => ({
                            station_id: obs.id_station,
                            timestamp: obs.date_obs,
                            t: k2c(obs.t),
                            u: obs.u,
                            vv: obs.vv,
                            dd: obs.dd,
                            ff: ms2kmh(obs.ff),
                            fxi: ms2kmh(obs.fxi10), // DB Column fxi
                            dxy: obs.dxi10, // Max wind direction
                            rr_per: obs.rr_per || 0, // IMPORTANT for daily_summaries trigger
                            td: k2c(obs.td),
                            pres: obs.pres ? Math.round(obs.pres / 100) : null, // hPa,
                            updated_at: new Date().toISOString()
                        }));

                    if (rowBatch.length > 0) {
                        const { error } = await supabase.from('observations_6mn').upsert(rowBatch, {
                            onConflict: 'station_id, timestamp'
                        });

                        if (error) {
                            process.stdout.write(`\n❌ DB Insert Error at ${dateStr}: ${error.message}\n`);
                        } else {
                            process.stdout.write(`✅ ${dateStr}: ${rowBatch.length} records in DB. \r`);
                        }
                    }
                } else if (res.status === 404) {
                    // Normal for future keys or if out of availability window
                }
            } catch (err) {
                console.error(`\n❌ Error at ${dateStr}:`, err.message);
            }

            current = new Date(current.getTime() - 6 * 60000);
            await new Promise(r => setTimeout(r, 400)); // Be gentle
        }

        console.log('\n--- ✨ SYNC COMPLETE ---');

    } catch (e) {
        console.error('❌ FATAL ERROR:', e.message);
    }
}

catchup();
