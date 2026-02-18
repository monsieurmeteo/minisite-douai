// Récupération des métadonnées des stations (Noms)
const fs = require('fs');

const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

// Token manuel que nous avons généré et qui est valide
const TOKEN = 'eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRRM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2MyYTE5YS1mZDVlLTQ5NDQtODlhYy02OGMxNjBiNGM1MWQiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJuYmYiOjE3Njg3Njk0NTAsImF6cCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3Njg3NzMwNTAsImlhdCI6MTc2ODc2OTQ1MCwianRpIjoiYTJmNWI3NTEtOTRiMi00OTdiLTg2NjYtNjJjZGZlMDYzMDY1IiwiY2xpZW50X2lkIjoiTWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYSJ9.SR1R2yCfPbdAUQ7Hj7cFTv8B-VpDh3Smv1hQEaWPcgtVvKHahS5DmoylPTn-BgeRw7m9rS9JLm_ZeaTS40APkEFlLOuZ5P8qECrHnUEQpaJOeQLFvKhpwHvgrKw0cTeHF2x0kTAgMoDGIHd7h_pTj4V_Q5aVXyJpA1tQjxkSb-opu-2F5--PDD-gIDgLoEu9XlLgcpW6_UAtnjrl8f0AEgJWFFop8yhsV647Hj3eyJ6zfg9WNgFtrTrc1uYaPNaN2AyxLW20VTujEkSolYoV1CnaahagQGQZMSI4kZxe-9j_upnelcWcXbvQrGA7pZB-SOM4rVYs7nfJNPf-sxM0fQ';

async function getStationList() {
    console.log('🔍 Recherche de la liste des stations...');

    // Essayer l'endpoint liste stations du paquet
    const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/liste-stations?format=json';

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log(`Status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Stations trouvées: ${data.length}`);
            if (data.length > 0) {
                console.log('Exemple:', data[0]);
                // Sauvegarder dans un fichier JSON pour l'utiliser dans l'app
                fs.writeFileSync('src/data/stations_names.json', JSON.stringify(data, null, 2));
                console.log('💾 Sauvegardé dans src/data/stations_names.json');
            }
        } else {
            console.log('❌ Erreur:', await response.text());
        }

    } catch (error) {
        console.error('❌ Exception:', error);
    }
}

getStationList();
