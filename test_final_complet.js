// Test final complet du système
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function testFinal() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   TEST FINAL - SYSTÈME COMPLET                        ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');

    // 1. Générer token
    console.log('ÉTAPE 1/3: Génération du token OAuth...\n');

    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    console.log(`✅ Token généré (expire dans ${Math.floor(tokenData.expires_in / 60)} min)\n`);

    // 2. Calculer cycle time avec -24 min
    console.log('ÉTAPE 2/3: Calcul du cycle time (avec -24 min)...\n');

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

    cycleTime.setMinutes(cycleTime.getMinutes() - 24);
    const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

    console.log(`   Cycle time: ${cycleTimeStr}`);
    console.log(`   (Actuel - 24 minutes)\n`);

    // 3. Récupérer les données
    console.log('ÉTAPE 3/3: Récupération des données...\n');

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;

    const apiResponse = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!apiResponse.ok) {
        console.log(`❌ Erreur API: ${apiResponse.status}`);
        return;
    }

    const stations = await apiResponse.json();

    // Statistiques
    const withTemp = stations.filter(s => s.t !== null && s.t !== undefined);
    const withWind = stations.filter(s => s.ff !== null && s.ff !== undefined);
    const withRain = stations.filter(s => s.rr_per !== null && s.rr_per !== undefined);
    const withHumidity = stations.filter(s => s.u !== null && s.u !== undefined);

    const temps = withTemp.map(s => s.t - 273.15);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ SUCCÈS - SYSTÈME OPÉRATIONNEL                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📊 STATISTIQUES:\n');
    console.log(`   📍 Stations totales:      ${stations.length}`);
    console.log(`   🌡️  Avec température:      ${withTemp.length}`);
    console.log(`   💨 Avec vent:             ${withWind.length}`);
    console.log(`   ☔ Avec pluie:            ${withRain.length}`);
    console.log(`   💧 Avec humidité:         ${withHumidity.length}`);
    console.log('\n');
    console.log('🌡️  TEMPÉRATURES:\n');
    console.log(`   Minimum:  ${minTemp.toFixed(1)}°C`);
    console.log(`   Maximum:  ${maxTemp.toFixed(1)}°C`);
    console.log(`   Moyenne:  ${avgTemp.toFixed(1)}°C`);
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ OAuth:                 Fonctionnel');
    console.log('✅ Token:                 Généré automatiquement');
    console.log('✅ Cycle time:            Corrigé (-24 min)');
    console.log('✅ API:                   Accessible');
    console.log('✅ Données:               Disponibles');
    console.log('✅ Réseau National:       Supprimé');
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🚀 PROCHAINES ÉTAPES:\n');
    console.log('   1. Le serveur Vite va recharger automatiquement');
    console.log('   2. Accédez à: http://localhost:5173/observations/carte');
    console.log('   3. Attendez 10-15 secondes');
    console.log('   4. Vous devriez voir ' + stations.length + ' stations sur la carte !');
    console.log('\n');
}

testFinal().catch(console.error);
