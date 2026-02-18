
const token = "eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9";

async function testMFStation() {
    try {
        const stationId = '59178001'; // Douai
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}&format=json`;

        console.log("Testing Météo France Station API...");
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Status:", response.status);
        if (response.status === 200) {
            const data = await response.json();
            console.log("Data sample:", JSON.stringify(data.properties, null, 2));
        } else {
            const txt = await response.text();
            console.log("Response:", txt);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testMFStation();
