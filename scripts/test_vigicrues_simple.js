
async function testVigicruesAPI() {
    console.log('🧪 Test de l\'API Vigicrues...\n');

    try {
        console.log('📡 Récupération du GeoJSON...');
        const response = await fetch('https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson');
        const geoJSON = await response.json();

        console.log('✅ GeoJSON récupéré avec succès!');
        console.log(`📊 Nombre de tronçons: ${geoJSON.features?.length || 0}`);

        // Compter les niveaux de vigilance
        const stats = { vert: 0, jaune: 0, orange: 0, rouge: 0 };
        geoJSON.features?.forEach(f => {
            const niveau = f.properties?.NivInfViCr || 1;
            switch (niveau) {
                case 1: stats.vert++; break;
                case 2: stats.jaune++; break;
                case 3: stats.orange++; break;
                case 4: stats.rouge++; break;
            }
        });

        console.log('\n📈 Statistiques de vigilance:');
        console.log(`   🟢 Vert (pas de vigilance): ${stats.vert}`);
        console.log(`   🟡 Jaune (risque de crue): ${stats.jaune}`);
        console.log(`   🟠 Orange (débordements): ${stats.orange}`);
        console.log(`   🔴 Rouge (crue majeure): ${stats.rouge}`);

        const total = stats.jaune + stats.orange + stats.rouge;
        if (total > 0) {
            console.log(`\n⚠️  ${total} tronçons en vigilance!`);
        } else {
            console.log('\n✅ Aucun tronçon en vigilance');
        }

        // Afficher quelques exemples
        console.log('\n📍 Exemples de tronçons:');
        geoJSON.features?.slice(0, 5).forEach(f => {
            const props = f.properties;
            const niveaux = ['', 'Vert', 'Jaune', 'Orange', 'Rouge'];
            console.log(`   - ${props.lbentcru} (${props.CdEntCru}) - ${niveaux[props.NivInfViCr] || 'Inconnu'}`);
        });

        // Chercher des tronçons dans le Nord
        console.log('\n🔍 Tronçons dans le Nord (59):');
        const nordTroncons = geoJSON.features?.filter(f =>
            f.properties?.lbentcru?.toLowerCase().includes('scarpe') ||
            f.properties?.lbentcru?.toLowerCase().includes('douai') ||
            f.properties?.lbentcru?.toLowerCase().includes('lys') ||
            f.properties?.lbentcru?.toLowerCase().includes('deûle')
        );

        if (nordTroncons?.length > 0) {
            nordTroncons.forEach(f => {
                const props = f.properties;
                const niveaux = ['', 'Vert', 'Jaune', 'Orange', 'Rouge'];
                console.log(`   - ${props.lbentcru} - ${niveaux[props.NivInfViCr] || 'Inconnu'}`);
            });
        } else {
            console.log('   Aucun tronçon trouvé pour cette région');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testVigicruesAPI();
