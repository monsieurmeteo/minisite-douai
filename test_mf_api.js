
const token = "eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9";

async function testMF() {
    try {
        const stationId = '59350005';
        // Trying DPAI01 instead of DPAL01
        const url = `https://public-api.meteofrance.fr/public/DPAI01/v1/observations/horaire/postes?id_station=${stationId}`;

        console.log("Testing Météo France API with DPAI01...");
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'apikey': token
            }
        });

        console.log("Status:", response.status);
        const txt = await response.text();
        console.log("Response:", txt);
    } catch (e) {
        console.error("Error:", e);
    }
}

testMF();
