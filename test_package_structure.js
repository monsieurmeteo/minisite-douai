
const BEARER_TOKEN = 'eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRRM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2MyYTE5YS1mZDVlLTQ5NDQtODlhYy02OGMxNjBiNGM1MWQiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJuYmYiOjE3Njg3NjQyNTksImF6cCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3Njg3Njc4NTksImlhdCI6MTc2ODc2NDI1OSwianRpIjoiMTIxZmU0NmQtOTNlYS00YzYxLTg2YjUtNTI3NGU2OTkzZWY0IiwiY2xpZW50X2lkIjoiTWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYSJ9.gZEveLrciqY7kHsSmQugmFUw5bbwXRTRObzY1rRVaMddb5bJ3DHf8kTJlJQrBE903wcHTvdV33BOfXiUJhKVW1lzS-k--4ml0WnxxM-OxLt32Z3UxQk5us9CAYrIP0U9sQbhui_7btr7OfTO1boaacGdfEAOPC9_LLBb3xwIo63jTP20VKQhUgiDfyjbJ2H-o1J8Tov8y0_3jp6TDsBqL8vWvQYUogqhTgInSZ-Cil6hdQLHVLSQGpwr3l9VyUs18g5zTQmp_o_CyK09pMDH1WT4tod4AG49xAUX2AqrqZG7OATw3ZageXZzrJUQfQnuKygYqzIp5rr009G4n61tQw';

async function examinePackageResponse() {
    const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=geojson';

    console.log("Récupération des données Package...\n");
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
        });

        if (res.status === 200) {
            const data = await res.json();
            console.log("Type de données:", typeof data);
            console.log("Est un Array?", Array.isArray(data));
            console.log("Clés de l'objet:", Object.keys(data));
            console.log("\nStructure complète (premiers 500 caractères):");
            console.log(JSON.stringify(data, null, 2).substring(0, 500));

            // Si c'est un GeoJSON
            if (data.type === 'FeatureCollection') {
                console.log("\n✅ C'est un GeoJSON FeatureCollection!");
                console.log("Nombre de stations:", data.features.length);
                console.log("\nPremière station complète:");
                console.log(JSON.stringify(data.features[0], null, 2));
            }
        }
    } catch (e) {
        console.log("Erreur:", e.message);
    }
}

examinePackageResponse();
