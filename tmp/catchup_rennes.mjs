import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function refreshToken() {
    console.log('🔄 Refreshing MF Token...');
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();
    return data.access_token;
}

async function catchUpRennes() {
    const stationId = '35281001';
    console.log(`🚀 Catching up data for ${stationId} for the last 6 hours...`);

    // 1. Get Token
    const token = await refreshToken();

    // 2. Fetch slots for the last 6 hours (60 slots)
    const now = new Date();
    const slots = [];
    for (let i = 0; i < 60; i++) {
        const slot = new Date(Math.floor(now.getTime() / 360000) * 360000 - i * 6 * 60000);
        slots.push(slot);
    }

    let insertedCount = 0;
    for (const slot of slots) {
        const dateStr = slot.toISOString().split('.')[0] + 'Z';
        // console.log(`Checking slot ${dateStr}...`);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${stationId}&date=${dateStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data[0]) {
                    const obs = data[0];
                    const row = {
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

                    const { error } = await supabase.from('observations_6mn').upsert(row, { onConflict: 'station_id, timestamp' });
                    if (!error) {
                        insertedCount++;
                    } else {
                        console.error(`❌ Upsert error for ${dateStr}:`, error.message);
                    }
                }
            } else if (res.status === 429) {
                console.warn('⚠️ Rate limited. Waiting 2s...');
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.error(`❌ Fetch error for ${dateStr}:`, e.message);
        }

        // Petit délai pour éviter 429
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`✅ Finished catching up for Rennes! ${insertedCount} slots processed/inserted.`);
}

catchUpRennes();
