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

async function catchup() {
    console.log('--- 🚀 START CATCHUP (Backward) ---');
    try {
        const { data: stations } = await supabase.from('stations').select('id');
        const validIds = new Set(stations?.map(s => s.id) || []);
        console.log(`📡 Targeting ${validIds.size} stations.`);

        let token = await refreshToken();

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
                    console.log(`⏳ 429 Rate limit at ${dateStr}. Waiting 10s...`);
                    await new Promise(r => setTimeout(r, 10000));
                    continue;
                }

                if (res.ok) {
                    const json = await res.json();
                    const observations = json.filter(obs => validIds.has(obs.id_station));

                    if (observations.length > 0) {
                        const rowBatch = observations.map(obs => ({
                            station_id: obs.id_station,
                            timestamp: obs.date_obs,
                            t: obs.t,
                            u: obs.u,
                            vv: obs.vv,
                            dd: obs.dd,
                            ff: Math.round(obs.ff * 3.6),
                            fxy: obs.fxy ? Math.round(obs.fxy * 3.6) : null,
                            dxy: obs.dxy,
                            hlyre: obs.hlyre,
                            rr6: obs.rr6 || 0,
                            td: obs.td,
                            pres: obs.pres,
                            updated_at: new Date().toISOString()
                        }));

                        const { error } = await supabase.from('observations_6mn').upsert(rowBatch, {
                            onConflict: 'station_id, timestamp',
                            schema: 'public'
                        });

                        if (error) {
                            console.error(`❌ DB Insert Error at ${dateStr}:`, error.message);
                        } else {
                            console.log(`✅ ${dateStr}: ${observations.length} records inserted.`);
                        }
                    } else {
                        console.log(`⚠️ No observations for our stations at ${dateStr}.`);
                    }
                } else {
                    console.log(`ℹ️ API ${res.status} at ${dateStr}.`);
                }
            } catch (err) {
                console.error(`\n❌ Network error at ${dateStr}:`, err.message);
            }

            current = new Date(current.getTime() - 6 * 60000);
            await new Promise(r => setTimeout(r, 500)); // Be gentle
        }

        console.log('--- ✨ ALL DONE ---');

    } catch (e) {
        console.error('❌ FATAL ERROR:', e.message);
    }
}

catchup();
