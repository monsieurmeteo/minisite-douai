// Test avec différents cycle times pour trouver les données
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function generateToken() {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

async function testCycleTime(token, cycleTimeStr, description) {
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;

    console.log(`\n📅 Test: ${description}`);
    console.log(`   Time: ${cycleTimeStr}`);

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.log(`   ❌ Status: ${response.status}`);
        return 0;
    }

    const stations = await response.json();
    console.log(`   ✅ Stations: ${stations.length}`);

    if (stations.length > 0) {
        const withTemp = stations.filter(s => s.t !== null).length;
        console.log(`   🌡️  Avec température: ${withTemp}`);
    }

    return stations.length;
}

async function findData() {
    console.log('🔍 RECHERCHE DES DONNÉES DISPONIBLES\n');
    console.log('═══════════════════════════════════════\n');

    const token = await generateToken();
    console.log('✅ Token OAuth généré\n');

    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;

    // Tester plusieurs cycles
    const tests = [];

    // Cycle actuel
    const current = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        roundedMinutes,
        0,
        0
    ));
    tests.push({ time: current, desc: 'Cycle actuel' });

    // Cycle -6 min
    const minus6 = new Date(current);
    minus6.setMinutes(minus6.getMinutes() - 6);
    tests.push({ time: minus6, desc: 'Cycle -6 min' });

    // Cycle -12 min
    const minus12 = new Date(current);
    minus12.setMinutes(minus12.getMinutes() - 12);
    tests.push({ time: minus12, desc: 'Cycle -12 min' });

    // Cycle -18 min
    const minus18 = new Date(current);
    minus18.setMinutes(minus18.getMinutes() - 18);
    tests.push({ time: minus18, desc: 'Cycle -18 min' });

    // Cycle -24 min
    const minus24 = new Date(current);
    minus24.setMinutes(minus24.getMinutes() - 24);
    tests.push({ time: minus24, desc: 'Cycle -24 min' });

    let bestCount = 0;
    let bestTime = null;

    for (const test of tests) {
        const timeStr = test.time.toISOString().split('.')[0] + 'Z';
        const count = await testCycleTime(token, timeStr, test.desc);

        if (count > bestCount) {
            bestCount = count;
            bestTime = timeStr;
        }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`\n🎯 MEILLEUR RÉSULTAT:`);
    console.log(`   Time: ${bestTime}`);
    console.log(`   Stations: ${bestCount}\n`);

    if (bestCount === 0) {
        console.log('❌ PROBLÈME: Aucune donnée disponible !');
        console.log('\n💡 Solutions possibles:');
        console.log('   1. L\'API n\'a peut-être pas encore de données pour aujourd\'hui');
        console.log('   2. Essayer sans le paramètre date (dernières données)');
        console.log('   3. Vérifier les permissions de l\'API\n');

        // Test sans date
        console.log('📝 Test SANS paramètre date...\n');
        const urlNoDate = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?format=json`;

        const response = await fetch(urlNoDate, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
            const stations = await response.json();
            console.log(`   ✅ Stations: ${stations.length}`);

            if (stations.length > 0) {
                console.log('\n🎉 SOLUTION TROUVÉE !');
                console.log('   → Utiliser l\'API SANS paramètre date');
                console.log('   → L\'API retourne automatiquement les dernières données\n');
            }
        } else {
            const error = await response.text();
            console.log(`   ❌ Erreur: ${error}`);
        }
    }
}

findData().catch(console.error);
