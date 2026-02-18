import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function updateAll() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get token
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) {
        console.error('❌ Token non trouvé');
        return;
    }

    console.log('🔄 Mise à jour complète en cours...\n');

    // ============================================
    // 1. MISE À JOUR 6 MINUTES (derniers cycles)
    // ============================================
    console.log('📊 Collecte 6 minutes...');

    const now = new Date();
    const cycles = [];

    // Collect last 30 cycles (3 hours)
    for (let i = 0; i < 30; i++) {
        const cycleTime = new Date(now);
        cycleTime.setMinutes(Math.floor(cycleTime.getMinutes() / 6) * 6, 0, 0);
        cycleTime.setMinutes(cycleTime.getMinutes() - (i * 6) - 30);
        cycles.push(cycleTime);
    }

    let total6mn = 0;
    for (const cycleTime of cycles) {
        const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) continue;

            const data = await res.json();

            const rows = data.map(obs => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: new Date(obs.validity_time || cycleTimeStr).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pres || null,
                rr_per: obs.rr_per || 0
            })).filter(r => r.station_id);

            const BATCH_SIZE = 100;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                await supabase.from('observations_6mn').upsert(batch, { onConflict: 'station_id, timestamp' });
            }

            total6mn += rows.length;
            process.stdout.write('.');
        } catch (e) {
            process.stdout.write('x');
        }
    }

    console.log(`\n✅ 6mn: ${total6mn} enregistrements`);

    // ============================================
    // 2. MISE À JOUR HORAIRE (dernières heures)
    // ============================================
    console.log('\n📊 Collecte horaire...');

    const hours = [];
    for (let i = 0; i < 6; i++) {
        const hourTime = new Date(now);
        hourTime.setMinutes(0, 0, 0);
        hourTime.setHours(hourTime.getHours() - i - 1);
        hours.push(hourTime);
    }

    let totalHoraire = 0;
    for (const hourTime of hours) {
        const hourTimeStr = hourTime.toISOString().split('.')[0] + 'Z';

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${hourTimeStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!res.ok) continue;

            const data = await res.json();

            const rows = data.map(obs => ({
                station_id: obs.id || obs.id_station || obs.geo_id_insee,
                timestamp: new Date(obs.validity_time || hourTimeStr).toISOString(),
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u || null,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
                dd: obs.dd || null,
                pres: obs.pres || null,
                rr1: obs.rr1 || 0,
                rr3: obs.rr3 || 0,
                rr6: obs.rr6 || 0,
                rr12: obs.rr12 || 0,
                rr24: obs.rr24 || 0
            })).filter(r => r.station_id);

            const BATCH_SIZE = 100;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                await supabase.from('observations_horaire').upsert(batch, { onConflict: 'station_id, timestamp' });
            }

            totalHoraire += rows.length;
            process.stdout.write('.');
        } catch (e) {
            process.stdout.write('x');
        }
    }

    console.log(`\n✅ Horaire: ${totalHoraire} enregistrements`);

    // ============================================
    // 3. VÉRIFICATION FINALE
    // ============================================
    console.log('\n' + '='.repeat(60));

    const { data: latest6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const { data: latestHoraire } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    console.log('📊 État final:');
    console.log(`   6mn: ${latest6mn?.[0]?.timestamp || 'Aucune donnée'}`);
    console.log(`   Horaire: ${latestHoraire?.[0]?.timestamp || 'Aucune donnée'}`);
    console.log('='.repeat(60));
}

updateAll();
