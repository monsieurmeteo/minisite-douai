// Test direct de l'API avec le token OAuth actuel
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function testComplete() {
    console.log('🧪 TEST COMPLET - API Météo France\n');
    console.log('═══════════════════════════════════════\n');

    // 1. Générer le token
    console.log('ÉTAPE 1: Génération du token OAuth...\n');

    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
        console.log('❌ Erreur génération token:', await tokenResponse.text());
        return;
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    console.log('✅ Token généré');
    console.log(`   Expire dans: ${tokenData.expires_in}s (${Math.floor(tokenData.expires_in / 60)} min)`);
    console.log(`   Token: ${token.substring(0, 50)}...\n`);

    // 2. Tester l'API Paquet
    console.log('ÉTAPE 2: Test API Paquet (toutes les stations)...\n');

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

    console.log(`   Cycle time: ${cycleTimeStr}`);

    const apiUrl = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;

    console.log(`   URL: ${apiUrl}\n`);

    const apiResponse = await fetch(apiUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    console.log(`   Status: ${apiResponse.status} ${apiResponse.statusText}`);

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.log(`   ❌ Erreur: ${errorText}\n`);
        return;
    }

    const stations = await apiResponse.json();

    console.log(`\n✅ SUCCÈS !`);
    console.log(`═══════════════════════════════════════`);
    console.log(`📍 Nombre total de stations: ${stations.length}`);

    // Statistiques
    const withTemp = stations.filter(s => s.t !== null && s.t !== undefined);
    const withWind = stations.filter(s => s.ff !== null && s.ff !== undefined);
    const withRain = stations.filter(s => s.rr_per !== null && s.rr_per !== undefined);
    const withHumidity = stations.filter(s => s.u !== null && s.u !== undefined);

    console.log(`🌡️  Avec température: ${withTemp.length}`);
    console.log(`💨 Avec vent: ${withWind.length}`);
    console.log(`☔ Avec pluie: ${withRain.length}`);
    console.log(`💧 Avec humidité: ${withHumidity.length}`);

    // Températures
    if (withTemp.length > 0) {
        const temps = withTemp.map(s => s.t - 273.15);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

        console.log(`\n📊 Températures:`);
        console.log(`   Min: ${minTemp.toFixed(1)}°C`);
        console.log(`   Max: ${maxTemp.toFixed(1)}°C`);
        console.log(`   Moyenne: ${avgTemp.toFixed(1)}°C`);
    }

    // Exemples de stations
    console.log(`\n📍 Exemples de stations:\n`);

    for (let i = 0; i < Math.min(5, stations.length); i++) {
        const s = stations[i];
        console.log(`   ${i + 1}. Station ${s.geo_id_insee || 'N/A'}`);
        console.log(`      Position: ${s.lat}°N, ${s.lon}°E`);
        console.log(`      Temp: ${s.t ? (s.t - 273.15).toFixed(1) + '°C' : 'N/A'}`);
        console.log(`      Vent: ${s.ff ? (s.ff * 3.6).toFixed(1) + ' km/h' : 'N/A'}`);
        console.log(`      Humidité: ${s.u !== null ? s.u + '%' : 'N/A'}`);
        console.log('');
    }

    console.log(`═══════════════════════════════════════`);
    console.log(`✅ L'API fonctionne parfaitement !`);
    console.log(`✅ ${stations.length} stations disponibles`);
    console.log(`✅ Prêt pour l'intégration dans l'application\n`);
}

testComplete().catch(console.error);
