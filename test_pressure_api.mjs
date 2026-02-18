import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Récupérer le token depuis Supabase
const { data: secrets } = await supabase
    .from('api_secrets')
    .select('access_token')
    .eq('provider', 'meteo_france')
    .single();

const token = secrets?.access_token;

if (!token) {
    console.log('❌ Token non trouvé');
    process.exit(1);
}

// Test avec une station du Nord
const now = new Date();
const cycleTime = new Date(now);
cycleTime.setMinutes(Math.floor(cycleTime.getMinutes() / 6) * 6, 0, 0);
cycleTime.setMinutes(cycleTime.getMinutes() - 12);
const dateStr = cycleTime.toISOString().split('.')[0] + 'Z';

console.log(`📡 Test API Météo France - Analyse Pression`);
console.log(`🕐 Cycle: ${dateStr}\n`);

const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;

try {
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        console.log(`❌ HTTP ${res.status}`);
        process.exit(1);
    }

    const data = await res.json();

    // Chercher stations du Nord (59xxx)
    const nordStations = data.filter(s => {
        const id = s.id || s.id_station || s.geo_id_insee;
        return id && id.toString().startsWith('59');
    });

    if (nordStations.length === 0) {
        console.log('⚠️  Aucune station 59 trouvée, affichage des premières stations:');
        data.slice(0, 3).forEach(s => {
            console.log(`   ID: ${s.id || s.geo_id_insee}`);
        });
        process.exit(0);
    }

    console.log(`✅ ${nordStations.length} stations du Nord (59) trouvées\n`);

    // Afficher les 3 premières
    nordStations.slice(0, 3).forEach(station => {
        const id = station.id || station.id_station || station.geo_id_insee;
        console.log(`📍 Station: ${id}`);
        console.log(`   pres (locale): ${station.pres ? `${station.pres} Pa → ${(station.pres / 100).toFixed(1)} hPa` : 'N/A'}`);
        console.log(`   pmer (niveau mer): ${station.pmer ? `${station.pmer} Pa → ${(station.pmer / 100).toFixed(1)} hPa` : 'N/A'}`);
        console.log(`   Température: ${station.t ? (station.t - 273.15).toFixed(1) : 'N/A'}°C`);
        console.log('');
    });

    console.log('💡 CONCLUSION:');
    console.log('   Pour avoir la pression météo standard (1018.6 hPa),');
    console.log('   il faut utiliser "pmer" au lieu de "pres" !');

} catch (error) {
    console.error('❌ Erreur:', error.message);
}
