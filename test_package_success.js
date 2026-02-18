
const BASIC_AUTH = 'TWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYTpuREtQV3pWcjJfMm81RWoxYVBaYTdPNmh1NElh';

async function getFreshTokenAndTestPackage() {
    console.log("=== Étape 1: Génération d'un nouveau token ===");

    try {
        const tokenRes = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${BASIC_AUTH}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (tokenRes.status !== 200) {
            console.log("❌ Erreur token:", await tokenRes.text());
            return;
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        console.log("✅ Token obtenu! Expire dans:", tokenData.expires_in, "secondes");

        console.log("\n=== Étape 2: Test API Package avec le nouveau token ===");
        const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=geojson';

        const dataRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log("Status:", dataRes.status);

        if (dataRes.status === 200) {
            const data = await dataRes.json();
            console.log("✅ Succès!");
            console.log("Type de réponse:", data.type);

            if (data.type === 'FeatureCollection' && data.features) {
                console.log("🎉 TOUTES LES STATIONS RÉCUPÉRÉES!");
                console.log("Nombre total de stations:", data.features.length);
                console.log("\n📍 Première station:");
                const first = data.features[0];
                console.log("  ID:", first.properties.geo_id_insee);
                console.log("  Coordonnées:", first.geometry.coordinates);
                console.log("  Température (K):", first.properties.t);
                console.log("  Température (°C):", first.properties.t ? (first.properties.t - 273.15).toFixed(1) : 'N/A');
                console.log("  Vent (m/s):", first.properties.ff);
                console.log("  Pluie (mm):", first.properties.rr_per);
            }
        } else {
            console.log("❌ Erreur:", await dataRes.text());
        }

    } catch (e) {
        console.log("❌ Exception:", e.message);
    }
}

getFreshTokenAndTestPackage();
