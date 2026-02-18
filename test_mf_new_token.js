
const token = "eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRTM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2MyYTE5YS1mZDVlLTQ5NDQtODlhYy02OGMxNjBiNGM1MWQiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJuYmYiOjE3Njg3NjExMTEsImF6cCI6Ik1oYXI5WVNzOExFbHVxNG5lWHFQMFllSGFha2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3Njg3NjQ3MTEsImlhdCI6MTc2ODc2MTExMSwianRpIjoiZGQxNmVmZDctODU5YS00MmZiLTljMGYtNzhhNmNmYWFjYjY2IiwiY2xpZW50X2lkIjoiTWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYSJ9.NZCnrS_6MMA0dt2waG-95dp3Pt_CFHX8AJYPFJXcOHvktXndMPARYwWWgPWly-RM9ccrq_NBv72AXbnTyX4OSi6jP-lnZAEYODXm7l1FyHUnFWPYg62d1yJMWaN46MbkR32oZGhmmCE-PgjwkpwVGuusl9cB4a2GjoQw95UFr2HJ13uMKhv0RF887iHTNZyEv7YdkSR6ZkuJ68by_J8NELZizyaWxugRr7F495T7hdqVGmKxJ3uo1Y_LUbaeZymE8yE9nsp_w10B4MAp2eesytukYkqLkI01wLGsMUkX5JKmOFy0KTA3MNOzTiACxJxFO8Cih2A6eXBOWbJw_hpQtA";

async function testMFStation() {
    try {
        const stationId = '59178001'; // Douai
        const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/horaire?id_station=${stationId}&format=json`;

        console.log("Testing Météo France Station API with NEW token...");
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Status:", response.status);
        if (response.status === 200) {
            const data = await response.json();
            console.log("SUCCESS! Data properties:", JSON.stringify(data.properties, null, 2));
        } else {
            const txt = await response.text();
            console.log("Error Response:", txt);
        }
    } catch (e) {
        console.error("Execution Error:", e);
    }
}

testMFStation();
