// Test avec le nouveau token API Key
const API_KEY = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9XSwiZXhwIjoxNzk0NzY2OTQ1LCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwiaWF0IjoxNzY4NzY2OTQ1LCJqdGkiOiJhMTMzZTY0OS05ZTlmLTQ4NTAtYjcwZS1kMjAxOTg3NDBkMGQifQ==.jAAGxrWF9e9KM_607tIBPhjIU8vGdqqcT8EEQPlQ9Q16HrzErIV4wOqS1RMueqQWLIzWYQSFX8auBgyB98u-g9IltfsVNrV8fAUDEbQxNX0Knd1dAI29aRcJXYV9tYzsu5QsCPlYW5mBv6IH5GDVW6YXpwAKWLFYRezx4N_9EiiJNfN2GrKZiRjs7McY6-qJhGrdX-7XU2lzrClp2Ib1If48g5xPoeLJWrDqtFSsayhgb1jF6zio1BrkUfjwouws8aPsAJiAaw83tfrBtiHgqbp4dmUOyRrALchucKKJqeHsJWVl_D2xF1kS4IV9rp-GfrvbtNNbilA8fBy18AfT5w==';

async function testAPIKey() {
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;
    const cycleTime = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        roundedMinutes,
        0, 0
    ));
    cycleTime.setMinutes(cycleTime.getMinutes() - 6);

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTime.toISOString()}&format=json`;

    console.log('🔍 TEST API KEY (10 MOIS)');
    console.log('Date:', cycleTime.toISOString());
    console.log('\n⏳ Requête...\n');

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        console.log('📡 Status:', res.status);

        if (res.status === 200) {
            const data = await res.json();
            console.log('\n✅✅✅ SUCCÈS TOTAL! ✅✅✅');
            console.log('📊 Stations:', data.length);
            console.log('\n🌡️ Première station:');
            console.log('  ID:', data[0].geo_id_insee);
            console.log('  Temp:', data[0].t ? `${(data[0].t - 273.15).toFixed(1)}°C` : 'N/A');
            console.log('\n🎯 L\'API KEY FONCTIONNE!');
            console.log('⚠️ MAIS le serveur npm doit être REDÉMARRÉ pour charger le nouveau code!');
        } else {
            const error = await res.text();
            console.log('\n❌ ERREUR:', error);
        }
    } catch (e) {
        console.log('\n❌ EXCEPTION:', e.message);
    }
}

testAPIKey();
