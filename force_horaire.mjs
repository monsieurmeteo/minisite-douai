import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function forceHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    console.log('🔄 INSERTION FORCÉE DES DONNÉES HORAIRES\n');

    // Just collect 13:00 UTC (14h française) as a test
    const testTime = '2026-01-19T13:00:00Z';
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${testTime}&format=json`;

    console.log(`📊 Test avec ${testTime} (14h française)...`);

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();

    console.log(`   Reçu: ${data.length} stations\n`);

    if (data.length > 0) {
        console.log('📋 Exemple de donnée:');
        const sample = data[0];
        console.log(`   ID: ${sample.id}`);
        console.log(`   validity_time: ${sample.validity_time}`);
        console.log(`   Temp: ${sample.t ? (sample.t - 273.15).toFixed(1) : 'N/A'}°C\n`);
    }

    // Transform data
    const rows = data.map(obs => ({
        station_id: obs.id || obs.id_station || obs.geo_id_insee,
        timestamp: obs.validity_time, // Use validity_time directly
        t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
        td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
        u: obs.u || null,
        ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
        fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
        dd: obs.dd || null,
        pres: obs.pres || null,
        rr1: obs.rr1 || 0
    })).filter(r => r.station_id);

    console.log(`💾 Insertion de ${rows.length} enregistrements...`);

    // Insert in batches
    const BATCH_SIZE = 100;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
            .from('observations_horaire')
            .upsert(batch, { onConflict: 'station_id, timestamp' })
            .select();

        if (error) {
            console.error(`   ❌ Erreur batch ${i}:`, error.message);
            totalErrors++;
        } else {
            totalInserted += (inserted?.length || 0);
            process.stdout.write('.');
        }
    }

    console.log(`\n\n✅ Résultat:`);
    console.log(`   Insérés: ${totalInserted}`);
    console.log(`   Erreurs: ${totalErrors}`);

    // Verify
    const { count } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true })
        .eq('timestamp', testTime);

    console.log(`\n🔍 Vérification: ${count} enregistrements pour ${testTime}`);
}

forceHoraire();
