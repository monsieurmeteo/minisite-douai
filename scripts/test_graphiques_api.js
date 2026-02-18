
async function testGraphiquesAPI() {
    console.log('🧪 Test des graphiques Vigicrues...\n');

    try {
        // 1. Récupérer un tronçon exemple
        console.log('📡 Récupération d\'un tronçon exemple...');
        const geoRes = await fetch('https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson');
        const geoData = await geoRes.json();

        const tronconExemple = geoData.features.find(f => f.properties.NivInfViCr > 1) || geoData.features[0];
        const props = tronconExemple.properties;

        console.log(`\n📍 Tronçon sélectionné: ${props.lbentcru}`);
        console.log(`   Code: ${props.CdEntCru}`);
        console.log(`   Type: ${props.typentcru}`);
        console.log(`   Vigilance: ${props.NivInfViCr}`);

        // 2. Tester les observations
        console.log('\n🔍 Test des observations...');
        try {
            const obsRes = await fetch('https://www.vigicrues.gouv.fr/services/observations.json');
            const obsData = await obsRes.json();
            console.log('✅ Observations disponibles!');
            console.log(`   Structure: ${Object.keys(obsData).join(', ')}`);
            console.log(`   Nombre d'éléments: ${obsData.NbElements || 0}`);

            if (obsData.Observations && obsData.Observations.length > 0) {
                const obs = obsData.Observations[0];
                console.log(`\n   Exemple d'observation:`);
                console.log(`   - Station: ${obs.CdStationHydro}`);
                console.log(`   - Série: ${obs.Serie?.length || 0} points`);
            }
        } catch (e) {
            console.log('❌ Erreur observations:', e.message);
        }

        // 3. Tester les prévisions
        console.log('\n🔮 Test des prévisions...');
        try {
            const prevRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/prevision.json');
            const prevData = await prevRes.json();
            console.log('✅ Prévisions disponibles!');
            console.log(`   Structure: ${Object.keys(prevData).join(', ')}`);

            if (prevData.ListEntVigiCru && prevData.ListEntVigiCru.length > 0) {
                console.log(`   Nombre d'entités avec prévisions: ${prevData.ListEntVigiCru.length}`);
                const prev = prevData.ListEntVigiCru[0];
                console.log(`\n   Exemple:`);
                console.log(`   - Code: ${prev.CdEntVigiCru}`);
                console.log(`   - Simulations: ${prev.ListSimulation?.length || 0}`);
            }
        } catch (e) {
            console.log('❌ Erreur prévisions:', e.message);
        }

        // 4. Tester les stations
        console.log('\n🏢 Test des stations...');
        try {
            const staRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/StaEntVigiCru.json');
            const staData = await staRes.json();
            console.log('✅ Stations disponibles!');

            const stations = staData.StaEntVigiCru || [];
            console.log(`   Nombre de stations: ${stations.length}`);

            if (stations.length > 0) {
                const sta = stations[0];
                console.log(`\n   Exemple de station:`);
                console.log(`   - Code: ${sta.CdEntVigiCru}`);
                console.log(`   - Nom: ${sta.LbEntVigiCru}`);
            }
        } catch (e) {
            console.log('❌ Erreur stations:', e.message);
        }

        // 5. Conclusion
        console.log('\n📊 CONCLUSION:');
        console.log('   Pour avoir des graphiques par tronçon, il faut:');
        console.log('   1. Récupérer les stations associées à chaque tronçon');
        console.log('   2. Pour chaque station, récupérer les observations');
        console.log('   3. Afficher les séries temporelles');
        console.log('\n   ⚠️  Note: Tous les tronçons n\'ont pas forcément de stations avec observations.');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testGraphiquesAPI();
