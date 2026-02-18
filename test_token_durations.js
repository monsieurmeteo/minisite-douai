
const BASIC_AUTH = 'TWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYTpuREtQV3pWcjJfMm81RWoxYVBaYTdPNmh1NElh';

async function testTokenDurations() {
    console.log("=== Test des durées de validité des tokens ===\n");

    // Durées à tester (en secondes)
    const durations = [
        { label: "1 heure", seconds: 3600 },
        { label: "1 jour", seconds: 86400 },
        { label: "1 mois", seconds: 2592000 },
        { label: "6 mois", seconds: 15552000 },
        { label: "1 an", seconds: 31536000 }
    ];

    for (const duration of durations) {
        console.log(`\n📅 Test: ${duration.label} (${duration.seconds} secondes)`);

        try {
            const response = await fetch('https://portail-api.meteofrance.fr/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${BASIC_AUTH}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `grant_type=client_credentials&validity_period=${duration.seconds}`
            });

            if (response.status === 200) {
                const data = await response.json();
                console.log(`✅ SUCCÈS!`);
                console.log(`   Token reçu: ${data.access_token.substring(0, 50)}...`);
                console.log(`   Expire dans: ${data.expires_in} secondes (${(data.expires_in / 86400).toFixed(1)} jours)`);

                // Décoder le JWT pour voir la date d'expiration
                const payload = JSON.parse(atob(data.access_token.split('.')[1]));
                const expDate = new Date(payload.exp * 1000);
                console.log(`   Date d'expiration: ${expDate.toLocaleString('fr-FR')}`);
            } else {
                const error = await response.text();
                console.log(`❌ ÉCHEC (${response.status})`);
                console.log(`   Erreur: ${error.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`❌ ERREUR: ${e.message}`);
        }

        // Pause pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n\n=== RÉSUMÉ ===");
    console.log("Si tous les tests ont réussi, vous pouvez configurer un token longue durée!");
    console.log("Sinon, le système actuel avec renouvellement automatique est optimal.");
}

testTokenDurations();
