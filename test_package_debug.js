
const BEARER_TOKEN = 'eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRRM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2MyYTE5YS1mZDVlLTQ5NDQtODlhYy02OGMxNjBiNGM1MWQiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJuYmYiOjE3Njg3NjQyNTksImF6cCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3Njg3Njc4NTksImlhdCI6MTc2ODc2NDI1OSwianRpIjoiMTIxZmU0NmQtOTNlYS00YzYxLTg2YjUtNTI3NGU2OTkzZWY0IiwiY2xpZW50X2lkIjoiTWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYSJ9.gZEveLrciqY7kHsSmQugmFUw5bbwXRTRObzY1rRVaMddb5bJ3DHf8kTJlJQrBE903wcHTvdV33BOfXiUJhKVW1lzS-k--4ml0WnxxM-OxLt32Z3UxQk5us9CAYrIP0U9sQbhui_7btr7OfTO1boaacGdfEAOPC9_LLBb3xwIo63jTP20VKQhUgiDfyjbJ2H-o1J8Tov8y0_3jp6TDsBqL8vWvQYUogqhTgInSZ-Cil6hdQLHVLSQGpwr3l9VyUs18g5zTQmp_o_CyK09pMDH1WT4tod4AG49xAUX2AqrqZG7OATw3ZageXZzrJUQfQnuKygYqzIp5rr009G4n61tQw';

async function testPackageDetailed() {
    const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=geojson';

    console.log("URL:", url);
    console.log("\nEnvoi de la requête...");

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
        });

        console.log("Status:", res.status);
        console.log("Headers:", [...res.headers.entries()]);

        const text = await res.text();
        console.log("\nTaille de la réponse:", text.length, "caractères");
        console.log("\nPremiers 1000 caractères:");
        console.log(text.substring(0, 1000));

        // Essayer de parser en JSON
        try {
            const data = JSON.parse(text);
            console.log("\n✅ JSON valide!");
            console.log("Type:", data.type);
            if (data.features) {
                console.log("Nombre de features:", data.features.length);
            }
        } catch (e) {
            console.log("\n❌ Pas du JSON:", e.message);
        }

    } catch (e) {
        console.log("ERREUR:", e);
    }
}

testPackageDetailed();
