// Script de synchronisation manuelle pour importer TOUTES les stations (France + OMM)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🌍 Synchronisation des stations internationales...\n');

// 1. Récupérer le token API
const { data: secrets } = await supabase
    .from('api_secrets')
    .select('access_token')
    .eq('provider', 'meteo_france')
    .single();

if (!secrets?.access_token) {
    console.error('❌ Pas de token trouvé');
    process.exit(1);
}

// 2. Récupérer la liste complète des stations
const response = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations', {
    headers: { 'Authorization': `Bearer ${secrets.access_token}` }
});

if (!response.ok) {
    console.error('❌ Erreur API:', response.status);
    process.exit(1);
}

const csvText = await response.text();
const lines = csvText.trim().split('\n');
const headers = lines[0].split(';').map(h => h.trim());

const rawStations = lines.slice(1).map(line => {
    const values = line.split(';');
    const obj = {};
    headers.forEach((h, i) => {
        obj[h] = values[i]?.trim();
    });
    return obj;
});

console.log(`📊 ${rawStations.length} stations trouvées dans l'API Météo-France`);

// 3. Transformer et catégoriser les stations
const stationMetadata = rawStations
    .filter(s => s.Id_station && s.Nom_usuel)
    .map(s => {
        const id = s.Id_station;
        let dept = id.substring(0, 2);

        // Gestion des stations internationales OMM (5 chiffres)
        // On les convertit en format 8 chiffres avec préfixe 000
        const stationId = id.length === 5 ? `000${id}` : id;

        // Pour les stations OMM, on extrait le département basé sur la région OMM
        if (stationId.startsWith('000')) {
            const region = stationId.substring(3, 4);
            const worldMap = { '6': 'M1', '1': 'M2', '3': 'M3', '4': 'M3', '2': 'M5', '5': 'M6', '7': 'M7' };
            dept = worldMap[region] || 'M1';
        } else if (stationId.startsWith('97') || stationId.startsWith('98')) {
            dept = stationId.substring(0, 3); // Outre-Mer
        }

        return {
            id: stationId,
            name: s.Nom_usuel,
            lat: parseFloat(s.Latitude) || null,
            lon: parseFloat(s.Longitude) || null,
            altitude: parseInt(s.Altitude) || null,
            dept: dept
        };
    });

const french = stationMetadata.filter(s => !s.id.startsWith('000') && s.id.length === 8);
const omm = stationMetadata.filter(s => s.id.startsWith('000'));
const om = stationMetadata.filter(s => s.id.startsWith('97') || s.id.startsWith('98'));

console.log(`  🇫🇷 France métropolitaine: ${french.length}`);
console.log(`  🏝️  Outre-Mer: ${om.length}`);
console.log(`  🌍 Internationales (OMM): ${omm.length}`);

// 4. Insérer dans Supabase par lots
console.log('\n💾 Insertion dans Supabase...');
for (let i = 0; i < stationMetadata.length; i += 100) {
    const batch = stationMetadata.slice(i, i + 100);
    const { error } = await supabase.from('stations').upsert(batch, { onConflict: 'id' });

    if (error) {
        console.error(`❌ Erreur batch ${i}:`, error.message);
    } else {
        console.log(`  ✓ ${Math.min(i + 100, stationMetadata.length)}/${stationMetadata.length} stations`);
    }
}

console.log('\n✅ Synchronisation terminée !');

// 5. Afficher quelques exemples de stations OMM
if (omm.length > 0) {
    console.log('\n🌍 Exemples de stations internationales ajoutées:');
    omm.slice(0, 20).forEach(s => {
        console.log(`  ${s.id} (${s.dept}) - ${s.name}`);
    });
}

console.log('\n🎯 Prochaine étape: Exécutez "node --env-file=.env.local regenerate_station_names.mjs" pour mettre à jour le fichier JSON');
