// Test direct de l'API avec le token
const TOKEN = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9XSwiZXhwIjoxNzk0NzY1MjAwLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwiaWF0IjoxNzY4NzY1MjAwLCJqdGkiOiJkODgxZmVhMS0wN2IwLTRkZWQtODgwOS1kYmE4ZWQwYTUxYWYifQ==.Hx3IgZ6VnABLXLHV5PWWEOpxrlJoV-G6diVCoMUctT6PuTyF1O9Fjffuk2KIueOlk6ku4btOcl7ElXBCXDoSjmHw15pOgOhswmg6nyCUEYvYRyak1Xy4o5a7r_hSabBpQOddd8Bnrx-tPaO1zRlo1dNKEyzSPTbr6sSWYYWeJocu_JVvK_rbzyl0gtE1lgRaezPYD1BntGjpZ59sXyXhmqn3jzDG8RIDJVG6Ie7HQrcfuH5Fnl-5OjgFo2O3eYK0vSTLfIaQP7-4qk0XroY1l81sFGkDTE1mfJk1B1zTHO03UV67ytzG0FN85TbefH-0npJXhdssQNXWcd-RuXpMhw==';

async function testAPI() {
    console.log('=== TEST API MÉTÉO FRANCE ===\n');

    // Calculer la date du dernier cycle
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

    const dateParam = cycleTime.toISOString();
    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateParam}&format=json`;

    console.log('URL:', url);
    console.log('Date:', dateParam);
    console.log('\nEnvoi de la requête...\n');

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log('Status:', response.status);

        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ SUCCÈS!');
            console.log('Nombre de stations:', data.length);
            console.log('\nPremière station:');
            console.log(JSON.stringify(data[0], null, 2));

            console.log('\n📊 Statistiques:');
            const withTemp = data.filter(s => s.t !== null).length;
            const withWind = data.filter(s => s.ff !== null).length;
            console.log('  - Stations avec température:', withTemp);
            console.log('  - Stations avec vent:', withWind);
        } else {
            const error = await response.text();
            console.log('❌ ERREUR:', error);
        }
    } catch (e) {
        console.log('❌ EXCEPTION:', e.message);
    }
}

testAPI();
