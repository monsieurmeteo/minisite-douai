
const token = "eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9";

async function testMFPackage() {
    try {
        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?format=json`;

        console.log("Testing Météo France Package API...");
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Status:", response.status);
        if (response.status === 200) {
            const data = await response.json();
            console.log("Stations Count:", data.features ? data.features.length : "N/A");
            if (data.features && data.features.length > 0) {
                console.log("Sample Station:", JSON.stringify(data.features[0], null, 2));
            }
        } else {
            const txt = await response.text();
            console.log("Response:", txt);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testMFPackage();
