import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function restoreSpecific() {
    console.log('🔄 Refreshing token...');
    const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
    const resAuth = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    const authData = await resAuth.json();
    const token = authData.access_token;

    const datesToRestore = [
        '2026-03-03T00:48:00Z',
        '2026-03-03T01:00:00Z'
    ];

    for (const d of datesToRestore) {
        console.log('Fetching bulk for', d);
        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${d}&format=json`;

        let success = false;
        while (!success) {
            try {
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const bulkData = await res.json();
                    if (Array.isArray(bulkData)) {
                        const rows = bulkData.map(obs => {
                            const sid = obs.id || obs.id_station || obs.geo_id_insee;
                            return {
                                station_id: sid,
                                timestamp: new Date(obs.validity_time || d).toISOString(),
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
                        if (error) console.error('DB error for', d, error);
                        else {
                            console.log(`✅ Restored ${rows.length} stations for ${d}`);
                            success = true;
                        }
                    } else {
                        success = true; // bad format
                    }
                } else {
                    console.log('❌ Failed API for', d, res.status);
                    if (res.status === 429) {
                        console.log('Waiting 3s for rate limit...');
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        success = true; // Other error, exit loop
                    }
                }
            } catch (e) {
                console.error('Error', d, e);
                success = true;
            }
        }
        await new Promise(r => setTimeout(r, 2000)); // Be gentle
    }
}
restoreSpecific();
