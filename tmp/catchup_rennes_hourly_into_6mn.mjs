import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function fetchHourlyAndInsert() {
    console.log('🔄 Refreshing token...');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const authData = await resAuth.json();
    const token = authData.access_token;

    // Entre 1h et 7h UTC
    let current = new Date('2026-03-03T01:00:00Z');
    const end = new Date('2026-03-03T07:00:00Z');

    while (current <= end) {
        let dateStr = current.toISOString().split('.')[0] + 'Z';

        console.log('Fetching hourly', dateStr);
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=35281001&date=${dateStr}&format=json`;
        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data && data[0]) {
                    const obs = data[0];
                    // Insert into observations_6mn
                    const row6mn = {
                        station_id: '35281001',
                        timestamp: obs.validity_time || dateStr,
                        t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                        td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                        u: obs.u != null ? obs.u : null,
                        ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                        fxi: obs.fxi != null ? Math.round(obs.fxi * 3.6) : null,
                        dd: obs.dd != null ? obs.dd : null,
                        pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                        rr_per: obs.rr1 != null ? obs.rr1 : 0 // approx rr_per avec rr1
                    };
                    await supabase.from('observations_6mn').upsert(row6mn, { onConflict: 'station_id, timestamp' });
                    console.log('✅ Inserted into 6mn:', dateStr);

                    // Insert into observations_horaire
                    const row1h = {
                        station_id: '35281001',
                        timestamp: obs.validity_time || dateStr,
                        t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                        td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                        u: obs.u != null ? obs.u : null,
                        ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                        fxi: obs.fxi != null ? Math.round(obs.fxi * 3.6) : null,
                        dd: obs.dd != null ? obs.dd : null,
                        pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                        rr1: obs.rr1 != null ? obs.rr1 : 0,
                        rr3: obs.rr3 != null ? obs.rr3 : 0,
                        rr6: obs.rr6 != null ? obs.rr6 : 0,
                        rr12: obs.rr12 != null ? obs.rr12 : 0,
                        rr24: obs.rr24 != null ? obs.rr24 : 0,
                        vv: obs.vv != null ? obs.vv : null,
                        insolh: obs.insolh != null ? obs.insolh : null
                    };
                    await supabase.from('observations_horaire').upsert(row1h, { onConflict: 'station_id, timestamp' });
                    console.log('✅ Inserted into horaire:', dateStr);
                } else {
                    console.log('⚠️ No data from API for', dateStr);
                }
            } else {
                console.log('❌ Error from API for', dateStr, res.status);
            }
        } catch (e) {
            console.log('Error catching', dateStr, e.message);
        }

        await new Promise(r => setTimeout(r, 600));
        current.setHours(current.getHours() + 1);
    }
}
fetchHourlyAndInsert();
