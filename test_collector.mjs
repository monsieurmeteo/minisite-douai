// Test du système de collecte
import { meteoCollector } from './src/services/meteoFranceCollector.js';

console.log('=== TEST DU COLLECTEUR ===\n');

// 1. Charger les données du localStorage
console.log('1. Chargement localStorage...');
meteoCollector.loadFromLocalStorage();

if (meteoCollector.latestData) {
    console.log('✅ Données trouvées dans localStorage');
    console.log('   Stations:', meteoCollector.latestData.stationCount);
    console.log('   Collecté à:', meteoCollector.latestData.collectedAt);
} else {
    console.log('❌ Pas de données dans localStorage');
    console.log('   → Démarrage de la collecte...');

    // 2. Démarrer la collecte
    meteoCollector.startAutoCollection();

    // 3. Attendre 20 secondes
    console.log('   Attente de 20 secondes...');

    setTimeout(() => {
        if (meteoCollector.latestData) {
            console.log('\n✅ COLLECTE RÉUSSIE!');
            console.log('   Stations:', meteoCollector.latestData.stationCount);
            console.log('   Première station:', meteoCollector.latestData.stations[0]);
        } else {
            console.log('\n❌ ÉCHEC - Pas de données après 20s');
            console.log('   Vérifiez la console pour les erreurs');
        }

        process.exit(0);
    }, 20000);
}
