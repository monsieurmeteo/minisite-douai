import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const lines = [];
const log = (msg) => { lines.push(msg); };

async function fullDiagnostic() {
    log('=== DIAGNOSTIC COMPLET ===');
    log('Heure: ' + new Date().toISOString());

    // 2. Dernières données 6mn
    log('--- OBS 6MN ---');
    const { data: d6, error: e6 } = await supabase
        .from('observations_6mn')
        .select('station_id, timestamp, t, ff')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (e6) log('ERR 6mn: ' + e6.message);
    else if (d6 && d6.length > 0) {
        const age = Math.round((Date.now() - new Date(d6[0].timestamp).getTime()) / 60000);
        log('Last 6mn: ' + d6[0].timestamp + ' (age: ' + age + ' min)');
        d6.forEach(r => log('  ' + r.timestamp + ': sta=' + r.station_id + ' t=' + r.t + ' ff=' + r.ff));
        log(age > 30 ? 'ALERTE: 6mn en retard!' : 'OK: 6mn a jour');
    } else log('VIDE: pas de 6mn');

    // 3. Données horaires
    log('--- OBS HORAIRE ---');
    const { data: dh, error: eh } = await supabase
        .from('observations_horaire')
        .select('station_id, timestamp, t')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (eh) log('ERR horaire: ' + eh.message);
    else if (dh && dh.length > 0) {
        const age = Math.round((Date.now() - new Date(dh[0].timestamp).getTime()) / 60000);
        log('Last horaire: ' + dh[0].timestamp + ' (age: ' + age + ' min)');
        dh.forEach(r => log('  ' + r.timestamp + ': sta=' + r.station_id + ' t=' + r.t));
        log(age > 120 ? 'ALERTE: horaire en retard!' : 'OK: horaire a jour');
    } else log('VIDE: pas de horaire');

    // 4. Vigilance
    log('--- VIGILANCE ---');
    const { data: dv, error: ev } = await supabase
        .from('vigilance_status')
        .select('dep_code, level, last_update')
        .order('last_update', { ascending: false })
        .limit(3);

    if (ev) log('ERR vigilance: ' + ev.message);
    else if (dv && dv.length > 0) {
        const age = Math.round((Date.now() - new Date(dv[0].last_update).getTime()) / 60000);
        log('Last vigilance: ' + dv[0].last_update + ' (age: ' + age + ' min)');
        log(age > 30 ? 'ALERTE: vigilance en retard!' : 'OK: vigilance a jour');
    } else log('VIDE: pas de vigilance');

    // 5. Token
    log('--- TOKEN ---');
    const { data: dt, error: et } = await supabase
        .from('api_secrets')
        .select('provider, updated_at')
        .eq('provider', 'meteo_france')
        .single();

    if (et) log('ERR token: ' + et.message);
    else if (dt) {
        const age = Math.round((Date.now() - new Date(dt.updated_at).getTime()) / 60000);
        log('Token age: ' + age + ' min (' + dt.updated_at + ')');
    }

    // 6. Stations
    log('--- STATIONS ---');
    const { data: ds, error: es } = await supabase.from('stations').select('id, name');
    if (es) log('ERR stations: ' + es.message);
    else {
        log('Nb stations: ' + (ds?.length || 0));
        if (ds) ds.forEach(s => log('  ' + s.id + ': ' + s.name));
    }

    // 7. Test Edge Function collect-6mn
    log('--- TEST collect-6mn ---');
    try {
        const r7 = await fetch(process.env.VITE_SUPABASE_URL + '/functions/v1/collect-6mn', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        });
        const b7 = await r7.text();
        log('collect-6mn status: ' + r7.status);
        log('collect-6mn body: ' + b7.substring(0, 500));
    } catch (e) { log('collect-6mn ERR: ' + e.message); }

    // 8. Test Edge Function collect-horaire
    log('--- TEST collect-horaire ---');
    try {
        const r8 = await fetch(process.env.VITE_SUPABASE_URL + '/functions/v1/collect-horaire', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        });
        const b8 = await r8.text();
        log('collect-horaire status: ' + r8.status);
        log('collect-horaire body: ' + b8.substring(0, 500));
    } catch (e) { log('collect-horaire ERR: ' + e.message); }

    // 9. Test Edge Function collect-vigilance
    log('--- TEST collect-vigilance ---');
    try {
        const r9 = await fetch(process.env.VITE_SUPABASE_URL + '/functions/v1/collect-vigilance', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        });
        const b9 = await r9.text();
        log('collect-vigilance status: ' + r9.status);
        log('collect-vigilance body: ' + b9.substring(0, 500));
    } catch (e) { log('collect-vigilance ERR: ' + e.message); }

    log('=== FIN ===');
    const output = lines.join('\n');
    fs.writeFileSync('tmp/diag_result.txt', output, 'utf-8');
    console.log(output);
}

fullDiagnostic().catch(err => { log('FATAL: ' + err.message); console.log(lines.join('\n')); });
