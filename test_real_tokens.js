
// Token 1 (Bearer Token - JWT)
const BEARER_TOKEN = 'eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRRM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2MyYTE5YS1mZDVlLTQ5NDQtODlhYy02OGMxNjBiNGM1MWQiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJuYmYiOjE3Njg3NjQyNTksImF6cCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3Njg3Njc4NTksImlhdCI6MTc2ODc2NDI1OSwianRpIjoiMTIxZmU0NmQtOTNlYS00YzYxLTg2YjUtNTI3NGU2OTkzZWY0IiwiY2xpZW50X2lkIjoiTWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYSJ9.gZEveLrciqY7kHsSmQugmFUw5bbwXRTRObzY1rRVaMddb5bJ3DHf8kTJlJQrBE903wcHTvdV33BOfXiUJhKVW1lzS-k--4ml0WnxxM-OxLt32Z3UxQk5us9CAYrIP0U9sQbhui_7btr7OfTO1boaacGdfEAOPC9_LLBb3xwIo63jTP20VKQhUgiDfyjbJ2H-o1J8Tov8y0_3jp6TDsBqL8vWvQYUogqhTgInSZ-Cil6hdQLHVLSQGpwr3l9VyUs18g5zTQmp_o_CyK09pMDH1WT4tod4AG49xAUX2AqrqZG7OATw3ZageXZzrJUQfQnuKygYqzIp5rr009G4n61tQw';

// Token 2 (Basic Auth - pour obtenir un Bearer)
const BASIC_AUTH = 'TWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYTpuREtQV3pWcjJfMm81RWoxYVBaYTdPNmh1NElh';

async function testAllAPIs() {
    console.log("=== TEST 1: API Station (DPObs) avec Bearer Token ===");
    const stationUrl = 'https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=59178001&format=json';

    try {
        const res1 = await fetch(stationUrl, {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
        });
        console.log("Status DPObs:", res1.status);
        if (res1.status === 200) {
            const data = await res1.json();
            console.log("✅ DPObs fonctionne! Données:", data[0]);
        }
    } catch (e) { console.log("Erreur:", e.message); }

    console.log("\n=== TEST 2: API Package (DPPaquetObs) avec Bearer Token ===");
    const paquetUrl = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=geojson';

    try {
        const res2 = await fetch(paquetUrl, {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
        });
        console.log("Status DPPaquetObs:", res2.status);
        if (res2.status === 200) {
            const data = await res2.json();
            console.log("✅ DPPaquetObs fonctionne! Stations:", data.features.length);
            console.log("Première station:", data.features[0].properties);
        } else {
            console.log("Erreur:", await res2.text());
        }
    } catch (e) { console.log("Erreur:", e.message); }

    console.log("\n=== TEST 3: Obtenir un nouveau token avec Basic Auth ===");
    try {
        const res3 = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${BASIC_AUTH}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        console.log("Status Token:", res3.status);
        if (res3.status === 200) {
            const tokenData = await res3.json();
            console.log("✅ Nouveau token obtenu!");
            console.log("Expire dans:", tokenData.expires_in, "secondes");
            console.log("Token:", tokenData.access_token.substring(0, 50) + "...");
        } else {
            console.log("Erreur:", await res3.text());
        }
    } catch (e) { console.log("Erreur:", e.message); }
}

testAllAPIs();
