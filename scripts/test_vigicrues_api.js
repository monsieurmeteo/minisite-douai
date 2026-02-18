
async function testVigicruuesAPI() {
    try {
        // 1. GeoJSON avec géométries des tronçons
        console.log('=== 1. GeoJSON des tronçons ===');
        const geoRes = await fetch('https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson');
        const geoData = await geoRes.json();
        console.log(`Type: ${geoData.type}`);
        console.log(`Nombre de features: ${geoData.features?.length || 0}`);
        if (geoData.features?.[0]) {
            console.log('Exemple de feature:', JSON.stringify(geoData.features[0], null, 2).substring(0, 500));
        }

        // 2. Tronçons de vigilance
        console.log('\n=== 2. Tronçons de vigilance ===');
        const tronRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/TronEntVigiCru.json');
        const tronData = await tronRes.json();
        const troncons = tronData.TronEntVigiCru || [];
        console.log(`Nombre de tronçons: ${troncons.length}`);
        if (troncons[0]) {
            console.log('Exemple:', JSON.stringify(troncons[0], null, 2));
        }

        // 3. Observations
        console.log('\n=== 3. Observations ===');
        const obsRes = await fetch('https://www.vigicrues.gouv.fr/services/observations.json');
        const obsData = await obsRes.json();
        console.log('Structure:', Object.keys(obsData));

        // 4. Prévisions
        console.log('\n=== 4. Prévisions ===');
        const prevRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/prevision.json');
        const prevData = await prevRes.json();
        console.log('Structure:', Object.keys(prevData));

    } catch (error) {
        console.error('Error:', error);
    }
}

testVigicruuesAPI();
