// Test rapide du collecteur automatique
// Exécuter avec : node test_auto_collector.js

const token = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9XSwiZXhwIjoxNzk0NzY2MzU4LCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwiaWF0IjoxNjg4NzY2MzU4LCJqdGkiOiJjNTQ0NTY1OC1mMjFmLTQxZmUtYjdiYy00NDBkZTFiZjQ0ZDgifQ==.sIuFc08geiye7mrHN6gusGyRrAhEF7Mm4qepJ7394do8WzoNdGbw2BtF-yURBjqyZprhOS6subAECLndabG-q0AM74Z50oZQ0uJgtSbItpM5CRuZq7wusoxiazVWTEnJxN3bkfwt3cI_LTaLQpx3PBOXLU3lmQF8qF8v4PAL32IeK8Pla5LKiSYHwEzEKXb6OoLnJp_35lqMzTxvNYTmR0l-fjFqxE9xE0EluQMqu2oZxBh0WOnsFmdSbHuMPikvUVAC-m1qHI1Hd1KEooLVG1JvJPs7ZQmqjESpbwqMu7bFupU24WPyGQK1SXjn9cGq2tbjT7YGuk52Y7hcZICCSQ==';

function getLatestCycleTime() {
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
    return cycleTime.toISOString().split('.')[0] + 'Z';
}

async function testCollector() {
    console.log('🧪 Test du collecteur automatique\n');
    console.log('═══════════════════════════════════════\n');

    const cycleTime = getLatestCycleTime();
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTime}&format=json`;

    console.log('📅 Cycle time:', cycleTime);
    console.log('🔗 URL:', url);
    console.log('\n🚀 Lancement de la requête...\n');

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
        console.log(`📊 Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`\n✅ SUCCÈS !`);
            console.log(`📍 Nombre de stations: ${data.length}`);

            // Statistiques
            const withTemp = data.filter(s => s.t !== null && s.t !== undefined);
            const withWind = data.filter(s => s.ff !== null && s.ff !== undefined);
            const withRain = data.filter(s => s.rr_per !== null && s.rr_per !== undefined);

            console.log(`\n📈 Statistiques:`);
            console.log(`   🌡️  Stations avec température: ${withTemp.length}`);
            console.log(`   💨 Stations avec vent: ${withWind.length}`);
            console.log(`   ☔ Stations avec pluie: ${withRain.length}`);

            // Exemple de station
            if (data.length > 0) {
                const example = data[0];
                console.log(`\n📍 Exemple de station:`);
                console.log(`   ID: ${example.geo_id_insee || 'N/A'}`);
                console.log(`   Position: ${example.lat}°N, ${example.lon}°E`);
                console.log(`   Température: ${example.t ? (example.t - 273.15).toFixed(1) + '°C' : 'N/A'}`);
                console.log(`   Vent: ${example.ff ? (example.ff * 3.6).toFixed(1) + ' km/h' : 'N/A'}`);
            }

            console.log(`\n═══════════════════════════════════════`);
            console.log(`✅ Le collecteur fonctionne parfaitement !`);
            console.log(`✅ Les pages d'observations devraient afficher les données`);
            console.log(`═══════════════════════════════════════\n`);

        } else {
            const errorText = await response.text();
            console.log(`\n❌ ERREUR !`);
            console.log(`Status: ${response.status}`);
            console.log(`Message:`, errorText);
            console.log(`\n💡 Vérifiez:`);
            console.log(`   1. Votre connexion internet`);
            console.log(`   2. Le token API (expire le 15/11/2026)`);
            console.log(`   3. Les limites de l'API (50 req/min)`);
        }

    } catch (error) {
        console.log(`\n❌ ERREUR DE CONNEXION !`);
        console.log(`Message:`, error.message);
        console.log(`\n💡 Vérifiez votre connexion internet`);
    }
}

// Exécuter le test
testCollector();
