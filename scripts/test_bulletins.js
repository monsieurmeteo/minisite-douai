
async function testBulletinsVigicrues() {
    console.log('🧪 Test des bulletins Vigicrues\n');

    try {
        // 1. Récupérer les tronçons
        const geoRes = await fetch('https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson');
        const geoData = await geoRes.json();

        // Trouver des tronçons en vigilance
        const tronconJaune = geoData.features.find(f => f.properties.NivInfViCr === 2);
        const tronconOrange = geoData.features.find(f => f.properties.NivInfViCr === 3);

        console.log('📍 Tronçons en vigilance trouvés:');
        if (tronconJaune) {
            console.log(`   Jaune: ${tronconJaune.properties.lbentcru} (${tronconJaune.properties.CdEntCru})`);
        }
        if (tronconOrange) {
            console.log(`   Orange: ${tronconOrange.properties.lbentcru} (${tronconOrange.properties.CdEntCru})`);
        }

        // 2. Tester différents endpoints pour les bulletins
        console.log('\n🔍 Test des endpoints bulletins...\n');

        // Endpoint 1: Territoires
        try {
            const terRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/TerEntVigiCru.json');
            const terData = await terRes.json();
            console.log('✅ TerEntVigiCru disponible');
            console.log(`   Territoires: ${terData.TerEntVigiCru?.length || 0}`);
            if (terData.TerEntVigiCru?.[0]) {
                const ter = terData.TerEntVigiCru[0];
                console.log(`   Exemple: ${ter.LbEntVigiCru} - ${Object.keys(ter).join(', ')}`);
            }
        } catch (e) {
            console.log('❌ TerEntVigiCru erreur');
        }

        // Endpoint 2: Tronçons détaillés
        try {
            const tronRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/TronEntVigiCru.json');
            const tronData = await tronRes.json();
            console.log('\n✅ TronEntVigiCru disponible');
            console.log(`   Tronçons: ${tronData.TronEntVigiCru?.length || 0}`);
            if (tronData.TronEntVigiCru?.[0]) {
                const tron = tronData.TronEntVigiCru[0];
                console.log(`   Propriétés: ${Object.keys(tron).join(', ')}`);
            }
        } catch (e) {
            console.log('❌ TronEntVigiCru erreur');
        }

        // Endpoint 3: Détail d'un tronçon spécifique
        if (tronconJaune) {
            try {
                const code = tronconJaune.properties.CdEntCru;
                const detailRes = await fetch(`https://www.vigicrues.gouv.fr/services/v1.1/TronEntVigiCru.json?CdEntVigiCru=${code}&TypEntVigiCru=8`);
                const detailData = await detailRes.json();
                console.log(`\n✅ Détail du tronçon ${code}`);
                console.log(`   Structure: ${Object.keys(detailData).join(', ')}`);
                if (detailData.TronEntVigiCru?.[0]) {
                    const detail = detailData.TronEntVigiCru[0];
                    console.log(`   Propriétés: ${Object.keys(detail).slice(0, 10).join(', ')}...`);

                    // Chercher des bulletins/commentaires
                    if (detail.ComEntVigiCru) {
                        console.log(`\n   📰 BULLETIN TROUVÉ!`);
                        console.log(`   ${detail.ComEntVigiCru.substring(0, 200)}...`);
                    }
                }
            } catch (e) {
                console.log('❌ Détail tronçon erreur:', e.message);
            }
        }

        // 4. Grouper par département
        console.log('\n📊 Tronçons par département:');
        const parDept = {};
        geoData.features.forEach(f => {
            const props = f.properties;
            // Le département pourrait être dans différentes propriétés
            const dept = props.cddient_1 || props.cdensup_1 || 'Inconnu';
            if (!parDept[dept]) parDept[dept] = [];
            parDept[dept].push({
                nom: props.lbentcru,
                code: props.CdEntCru,
                vigilance: props.NivInfViCr
            });
        });

        Object.entries(parDept).slice(0, 5).forEach(([dept, troncons]) => {
            const enVigilance = troncons.filter(t => t.vigilance > 1).length;
            console.log(`   ${dept}: ${troncons.length} tronçons${enVigilance > 0 ? ` (${enVigilance} en vigilance)` : ''}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testBulletinsVigicrues();
