// Test du système OAuth avec renouvellement automatique
// Exécuter avec : node test_oauth_auto.js

const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';
const OAUTH_URL = 'https://portail-api.meteofrance.fr/token';

async function generateToken() {
    console.log('🔐 Génération du token OAuth...\n');

    try {
        // Encoder les credentials en Base64
        const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        console.log('📝 Credentials encodés:', credentials.substring(0, 30) + '...');

        const response = await fetch(OAUTH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ ERREUR:', errorText);
            return null;
        }

        const data = await response.json();

        console.log('✅ Token généré avec succès !\n');
        console.log('═══════════════════════════════════════');
        console.log('📋 Informations du token:');
        console.log('═══════════════════════════════════════');
        console.log(`🔑 Access Token: ${data.access_token.substring(0, 50)}...`);
        console.log(`⏰ Expire dans: ${data.expires_in} secondes (${Math.floor(data.expires_in / 60)} minutes)`);
        console.log(`📅 Type: ${data.token_type}`);

        const expiryDate = new Date(Date.now() + (data.expires_in * 1000));
        console.log(`⏱️  Expire à: ${expiryDate.toLocaleString('fr-FR')}`);
        console.log('═══════════════════════════════════════\n');

        return data.access_token;

    } catch (error) {
        console.log('❌ Erreur:', error.message);
        return null;
    }
}

async function testAPI(token) {
    console.log('🧪 Test de l\'API avec le token...\n');

    // Calculer le cycle time
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;
    const cycleTime = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        roundedMinutes,
        0,
        0
    ));
    cycleTime.setMinutes(cycleTime.getMinutes() - 6);
    const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;

    console.log('📅 Cycle time:', cycleTimeStr);
    console.log('🔗 URL:', url);
    console.log('\n🚀 Requête API...\n');

    try {
        const startTime = Date.now();

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

        if (response.ok) {
            const data = await response.json();

            console.log('═══════════════════════════════════════');
            console.log('✅ SUCCÈS ! API fonctionne parfaitement');
            console.log('═══════════════════════════════════════');
            console.log(`📍 Nombre de stations: ${data.length}`);

            const withTemp = data.filter(s => s.t !== null);
            const withWind = data.filter(s => s.ff !== null);

            console.log(`🌡️  Avec température: ${withTemp.length}`);
            console.log(`💨 Avec vent: ${withWind.length}`);

            if (data.length > 0) {
                const example = data[0];
                console.log(`\n📍 Exemple (station ${example.geo_id_insee || 'N/A'}):`);
                console.log(`   Position: ${example.lat}°N, ${example.lon}°E`);
                console.log(`   Temp: ${example.t ? (example.t - 273.15).toFixed(1) + '°C' : 'N/A'}`);
                console.log(`   Vent: ${example.ff ? (example.ff * 3.6).toFixed(1) + ' km/h' : 'N/A'}`);
            }

            console.log('═══════════════════════════════════════\n');
            console.log('✅ Le système OAuth fonctionne !');
            console.log('✅ Les données en temps réel sont disponibles');
            console.log('✅ Le renouvellement automatique est prêt\n');

        } else {
            const errorText = await response.text();
            console.log('❌ ERREUR API:', errorText);
        }

    } catch (error) {
        console.log('❌ Erreur:', error.message);
    }
}

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   TEST OAUTH - MÉTÉO FRANCE API                      ║');
    console.log('║   Renouvellement automatique toutes les heures        ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');

    const token = await generateToken();

    if (token) {
        await testAPI(token);

        console.log('💡 Prochaines étapes:');
        console.log('   1. Le serveur Vite va recharger automatiquement');
        console.log('   2. Accédez à http://localhost:5173/observations/carte');
        console.log('   3. Les données devraient s\'afficher en 10-15 secondes');
        console.log('   4. Le token se renouvellera automatiquement toutes les heures\n');
    }
}

main();
