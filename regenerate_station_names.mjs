// Script pour régénérer stationNames.json avec TOUTES les stations (France + OMM)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Récupération de toutes les stations depuis Supabase...\n');

// Récupérer toutes les stations par lots
let allStations = [];
let from = 0;
const batchSize = 1000;

while (true) {
    const { data, error } = await supabase
        .from('stations')
        .select('id, name')
        .range(from, from + batchSize - 1)
        .order('id');

    if (error) {
        console.error('❌ Erreur Supabase:', error.message);
        process.exit(1);
    }

    if (!data || data.length === 0) break;

    allStations.push(...data);
    console.log(`  ✓ Chargé ${allStations.length} stations...`);

    if (data.length < batchSize) break;
    from += batchSize;
}

console.log(`\n📊 Total: ${allStations.length} stations récupérées`);

// Analyser les types de stations
const french = allStations.filter(s => s.id.length === 8 && !s.id.startsWith('000'));
const omm = allStations.filter(s => s.id.length === 5 || (s.id.length === 8 && s.id.startsWith('000')));

console.log(`  🇫🇷 France: ${french.length}`);
console.log(`  🌍 OMM (International): ${omm.length}`);

// Créer l'objet stationNames
const stationNames = {};
allStations.forEach(station => {
    stationNames[station.id] = station.name;
});

// Sauvegarder dans le fichier JSON
const outputPath = path.join(process.cwd(), 'src', 'data', 'stationNames.json');
fs.writeFileSync(outputPath, JSON.stringify(stationNames, null, 2), 'utf-8');

console.log(`\n✅ Fichier généré: ${outputPath}`);
console.log(`📝 ${Object.keys(stationNames).length} stations enregistrées`);

// Afficher quelques exemples de stations OMM
if (omm.length > 0) {
    console.log('\n🌍 Exemples de stations internationales:');
    omm.slice(0, 15).forEach(s => {
        console.log(`  ${s.id} - ${s.name}`);
    });
}

console.log('\n🎉 Terminé ! Rechargez votre application pour voir les nouvelles stations.');
