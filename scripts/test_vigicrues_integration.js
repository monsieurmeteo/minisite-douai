import { fetchTronçonsGeoJSON } from '../../services/vigicruuesService';

async function testVigicruesIntegration() {
    console.log('🧪 Test de l\'intégration Vigicrues...\n');

    try {
        const geoJSON = await fetchTronçonsGeoJSON();

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

        if (stats.jaune + stats.orange + stats.rouge > 0) {
            console.log(`\n⚠️  ${stats.jaune + stats.orange + stats.rouge} tronçons en vigilance!`);
        } else {
            console.log('\n✅ Aucun tronçon en vigilance');
        }

        // Afficher quelques exemples
        console.log('\n📍 Exemples de tronçons:');
        geoJSON.features?.slice(0, 3).forEach(f => {
            const props = f.properties;
            console.log(`   - ${props.lbentcru} (${props.CdEntCru}) - Niveau ${props.NivInfViCr}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testVigicruesIntegration();
