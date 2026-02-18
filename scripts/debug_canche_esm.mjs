
const fetch = require('node-fetch'); // Pour env node custom si besoin, mais je vais utiliser l'environnement natif du runner si possible.

async function debugCanche() {
    console.log('🔍 Recherche de "Canche" dans le GeoJSON...');

    try {
        const geoRes = await fetch('https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson');
        const geoJson = await geoRes.json();

        // Trouver la Canche
        const canche = geoJson.features.find(f => f.properties.lbentcru && f.properties.lbentcru.includes('Canche'));

        if (!canche) {
            console.log('❌ Tronçon "Canche" non trouvé dans le GeoJSON.');
            return;
        }

        const code = canche.properties.CdEntCru; // ex: "E540001001" ?
        const props = canche.properties;
        console.log(`✅ Trouvé : ${props.lbentcru} (Code: ${code})`);
        console.log('   Props:', JSON.stringify(props, null, 2));

        // Tester l'appel Détail avec différentes variantes
        // Variante 1 : TypEntVigiCru=8 (ce que j'utilise)
        await testApi(code, 8);

        // Variante 2 : TypEntVigiCru=4 ?
        await testApi(code, 4);

        // Variante 3 : Sans type ?
        await testApi(code, null);

        // Variante 4 : Test sur le code Station direct si on le connait (E541000401)
        console.log('\n--- Test Observation Station E541000401 ---');
        const obsUrl = `https://www.vigicrues.gouv.fr/services/observations.json?CdStationHydro=E541000401`;
        const obsRes = await fetch(obsUrl);
        if (obsRes.ok) {
            const obsData = await obsRes.json();
            if (obsData.Serie && obsData.Serie.ObssHydro) {
                console.log(`✅ Obs station OK (${obsData.Serie.ObssHydro.length} points)`);
            } else {
                console.log('❌ Obs station vide');
            }
        } else {
            console.log(`❌ Erreur Obs station: ${obsRes.status}`);
        }

    } catch (e) {
        console.error('Erreur globale:', e);
    }
}

async function testApi(code, type) {
    const url = `https://www.vigicrues.gouv.fr/services/v1.1/TronEntVigiCru.json?CdEntVigiCru=${code}${type ? `&TypEntVigiCru=${type}` : ''}`;
    console.log(`\n📡 Test URL: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`   ❌ Erreur HTTP ${res.status}`);
            return;
        }
        const json = await res.json();
        const items = json.TronEntVigiCru || json.ListEntVigiCru || [];
        console.log(`   📦 Items reçus: ${items.length}`);

        items.forEach(i => {
            console.log(`     - Enfant: ${i.CdEntVigiCruInferieur} (${i.LbEntVigiCruInferieur}) [Type: ${i.TypEntVigiCruInferieur}]`);
        });

    } catch (e) {
        console.log('   ❌ Erreur parsing/fetch', e.message);
    }
}

// Fallback fetch pour node si besoin
if (typeof fetch === 'undefined') {
    // On suppose que l'env a fetch, sinon on ne peut pas faire grand chose en pur script sans deps
    console.log('Fetch non disponible nativement. Essai terminé.');
} else {
    debugCanche();
}
