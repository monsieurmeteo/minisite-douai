
const token = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9XSwiZXhwIjoxNzk0NzY1MjAwLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwiaWF0IjoxNzY4NzY1MjAwLCJqdGkiOiJkODgxZmVhMS0wN2IwLTRkZWQtODgwOS1kYmE4ZWQwYTUxYWYifQ==.Hx3IgZ6VnABLXLHV5PWWEOpxrlJoV-G6diVCoMUctT6PuTyF1O9Fjffuk2KIueOlk6ku4btOcl7ElXBCXDoSjmHw15pOgOhswmg6nyCUEYvYRyak1Xy4o5a7r_hSabBpQOddd8Bnrx-tPaO1zRlo1dNKEyzSPTbr6sSWYYWeJocu_JVvK_rbzyl0gtE1lgRaezPYD1BntGjpZ59sXyXhmqn3jzDG8RIDJVG6Ie7HQrcfuH5Fnl-5OjgFo2O3eYK0vSTLfIaQP7-4qk0XroY1l81sFGkDTE1mfJk1B1zTHO03UV67ytzG0FN85TbefH-0npJXhdssQNXWcd-RuXpMhw==';

// Décoder le JWT
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));

console.log("=== ANALYSE DU TOKEN LONGUE DURÉE ===\n");

console.log("📅 Dates importantes:");
console.log("  Émis le (iat):", new Date(payload.iat * 1000).toLocaleString('fr-FR'));
console.log("  Expire le (exp):", new Date(payload.exp * 1000).toLocaleString('fr-FR'));

const now = Date.now() / 1000;
const remainingSeconds = payload.exp - now;
const remainingDays = Math.floor(remainingSeconds / 86400);
const remainingMonths = Math.floor(remainingDays / 30);

console.log("\n⏱️ Durée de validité:");
console.log("  Total:", (payload.exp - payload.iat), "secondes");
console.log("  Soit:", Math.floor((payload.exp - payload.iat) / 86400), "jours");
console.log("  Soit:", Math.floor((payload.exp - payload.iat) / 86400 / 30), "mois");

console.log("\n⏳ Temps restant:");
console.log("  Secondes:", Math.floor(remainingSeconds));
console.log("  Jours:", remainingDays);
console.log("  Mois:", remainingMonths);

console.log("\n🎯 Type de token:", payload.token_type);
console.log("👤 Utilisateur:", payload.sub);

console.log("\n📊 APIs souscrites:");
payload.subscribedAPIs.forEach(api => {
    console.log(`  - ${api.name} (${api.context})`);
});

console.log("\n\n=== TEST DE L'API ===\n");

async function testLongToken() {
    const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=json';

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("Status:", res.status);

        if (res.status === 200) {
            const data = await res.json();
            console.log("✅ TOKEN FONCTIONNE PARFAITEMENT!");
            console.log("📡 Stations récupérées:", data.length);
            console.log("\n🎉 CONCLUSION: Token longue durée de", remainingMonths, "mois VALIDÉ!");
        } else {
            console.log("❌ Erreur:", await res.text());
        }
    } catch (e) {
        console.log("❌ Exception:", e.message);
    }
}

testLongToken();
