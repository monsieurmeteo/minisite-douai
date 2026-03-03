import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function catchupRennesMorning() {
    console.log('Refreshing token...');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const authData = await resAuth.json();
    const token = authData.access_token;
    console.log('Token obtained.');

    const sid = '35281001';

    // Generate slots between 1:00 am and 7:00 am (inclusive) today (2026-03-03T01:00:00Z to 2026-03-03T07:00:00Z)
    const slots = [];
    const startTime = new Date('2026-03-03T01:00:00Z');
    const endTime = new Date('2026-03-03T07:00:00Z');

    let current = startTime;
    while (current <= endTime) {
        slots.push(current.toISOString().replace('.000Z', 'Z'));
        current = new Date(current.getTime() + 6 * 60000);
    }

    console.log(`Going to fetch ${slots.length} missing slots for Rennes...`);

    let totalInserted = 0;

    for (const dateStr of slots) {
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${sid}&date=${dateStr}&format=json`;
        console.log(`Fetching Rennes for ${dateStr}...`);

        try {
            let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.status === 401) {
                console.log('Token expired, refreshing...');
                const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
                const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'grant_type=client_credentials'
                });
                const authData = await resAuth.json();
                token = authData.access_token;
                res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            }
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data[0]) {
                    const obs = data[0];
                    const row = {
                        station_id: sid,
                        timestamp: obs.validity_time || dateStr,
                        t: obs.t != null ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                        td: obs.td != null ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                        u: obs.u != null ? obs.u : null,
                        ff: obs.ff != null ? Math.round(obs.ff * 3.6) : null,
                        fxi: obs.fxi10 != null ? Math.round(obs.fxi10 * 3.6) : (obs.fxi != null ? Math.round(obs.fxi * 3.6) : null),
                        dd: obs.dd != null ? obs.dd : null,
                        pres: obs.pmer != null ? Math.round(obs.pmer / 100 * 10) / 10 : (obs.pres != null ? Math.round(obs.pres / 100 * 10) / 10 : null),
                        rr_per: obs.rr_per != null ? obs.rr_per : 0
                    };

                    const { error } = await supabase.from('observations_6mn').upsert(row, { onConflict: 'station_id, timestamp' });
                    if (error) {
                        console.error(`DB Error for ${dateStr}:`, error);
                    } else {
                        console.log(`✅ Success for ${dateStr}`);
                        totalInserted++;
                    }
                } else {
                    console.log(`⚠️ No data available for ${dateStr}`);
                }
            } else {
                console.log(`❌ Failed for ${dateStr}: ${res.status}`);
            }
        } catch (e) {
            console.error(`Request failed for ${dateStr}:`, e.message);
        }

        // Anti rate limit
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`Done. Inserted ${totalInserted} rows for Rennes.`);
}

catchupRennesMorning();
