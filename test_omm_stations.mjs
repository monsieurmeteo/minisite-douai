// Test rapide pour voir si l'API MF retourne les stations OMM
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Récupérer le token
const { data: secrets } = await supabase
    .from('api_secrets')
    .select('access_token')
    .eq('provider', 'meteo_france')
    .single();

if (!secrets?.access_token) {
    console.error('❌ Pas de token trouvé');
    process.exit(1);
}

// 2. Appeler l'API liste-stations (en CSV car JSON ne marche pas toujours)
const response = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations', {
    headers: { 'Authorization': `Bearer ${secrets.access_token}` }
});

if (!response.ok) {
    console.error('❌ Erreur API:', response.status);
    process.exit(1);
}

const csvText = await response.text();
const lines = csvText.trim().split('\n');
const headers = lines[0].split(';');

const stations = lines.slice(1).map(line => {
    const values = line.split(';');
    const obj = {};
    headers.forEach((h, i) => {
        obj[h.trim()] = values[i]?.trim();
    });
    return obj;
});

console.log('📊 Total stations:', stations.length);

// Analyser les types de stations
const french = stations.filter(s => s.Id_station && s.Id_station.length === 8);
const omm5 = stations.filter(s => s.Id_station && s.Id_station.length === 5);
const omm8 = stations.filter(s => s.Id_station && s.Id_station.length === 8 && s.Id_station.startsWith('000'));

console.log('🇫🇷 Stations françaises (8 chiffres):', french.length);
console.log('🌍 Stations OMM (5 chiffres):', omm5.length);
console.log('🌍 Stations OMM (8 chiffres avec 000):', omm8.length);

if (omm5.length > 0) {
    console.log('\n📍 Exemples de stations OMM (5 chiffres):');
    omm5.slice(0, 10).forEach(s => {
        console.log(`  ${s.Id_station} - ${s.Nom_usuel}`);
    });
}

if (omm8.length > 0) {
    console.log('\n📍 Exemples de stations OMM (8 chiffres):');
    omm8.slice(0, 10).forEach(s => {
        console.log(`  ${s.Id_station} - ${s.Nom_usuel}`);
    });
}
