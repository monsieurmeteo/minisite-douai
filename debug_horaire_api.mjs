import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function debugHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    console.log('🔍 DEBUG: Que retourne l\'API horaire?\n');

    const testTime = '2026-01-19T13:00:00Z'; // 14h française
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${testTime}&format=json`;

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();

    console.log(`📊 Requête pour: ${testTime} (14h française)`);
    console.log(`   Stations reçues: ${data.length}\n`);

    if (data.length > 0) {
        const sample = data[0];
        console.log('📋 Exemple de donnée reçue:');
        console.log(`   ID: ${sample.id || sample.id_station || sample.geo_id_insee}`);
        console.log(`   validity_time: ${sample.validity_time}`);
        console.log(`   Température: ${sample.t ? (sample.t - 273.15).toFixed(1) : 'N/A'}°C`);
        console.log(`   Vent: ${sample.ff ? (sample.ff * 3.6).toFixed(0) : 'N/A'} km/h`);

        console.log('\n🔍 Tous les champs disponibles:');
        console.log(Object.keys(sample).join(', '));
    }

    // Check what's actually in the database
    const { data: dbData } = await supabase
        .from('observations_horaire')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(3);

    console.log('\n📊 Ce qui est dans la base (3 derniers):');
    dbData?.forEach((record, i) => {
        console.log(`${i + 1}. ${record.timestamp} - Station ${record.station_id}`);
    });
}

debugHoraire();
