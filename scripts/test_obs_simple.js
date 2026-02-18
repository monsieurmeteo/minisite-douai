
async function testObservationsSimple() {
    console.log('🧪 Test observations Vigicrues\n');

    try {
        // Test observations globales
        const res = await fetch('https://www.vigicrues.gouv.fr/services/observations.json');
        const data = await res.json();

        console.log('✅ API Observations fonctionne!');
        console.log(`📊 ${data.NbElements || 0} observations disponibles\n`);

        if (data.Observations && data.Observations.length > 0) {
            console.log('📍 Exemples d\'observations:');
            data.Observations.slice(0, 3).forEach((obs, i) => {
                console.log(`\n${i + 1}. Station: ${obs.CdStationHydro}`);
                console.log(`   Points de données: ${obs.Serie?.length || 0}`);
                if (obs.Serie && obs.Serie.length > 0) {
                    const dernierPoint = obs.Serie[obs.Serie.length - 1];
                    console.log(`   Dernière valeur: ${dernierPoint.ResObsHydro} à ${dernierPoint.DtObsHydro}`);
                }
            });

            console.log('\n✅ CONCLUSION: On peut obtenir des graphiques!');
            console.log('   - Chaque observation contient une série temporelle');
            console.log('   - On peut afficher l\'évolution du niveau d\'eau');
            console.log(`   - ${data.NbElements} stations ont des données`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testObservationsSimple();
