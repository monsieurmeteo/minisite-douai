
const BASIC_AUTH = 'TWhhcjlZU3M4TEVsdXE0bmVYcVAwWWVIYWFrYTpuREtQV3pWcjJfMm81RWoxYVBaYTdPNmh1NElh';

async function analyzePackageFormat() {
    // Obtenir un token frais
    const tokenRes = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${BASIC_AUTH}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Tester avec format=json au lieu de geojson
    const url = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-18T18:00:00Z&format=json';

    const dataRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (dataRes.status === 200) {
        const data = await dataRes.json();
        console.log("Format: JSON simple");
        console.log("Est un Array?", Array.isArray(data));
        console.log("Nombre d'éléments:", data.length);
        console.log("\n🎉 PREMIÈRE STATION:");
        console.log(JSON.stringify(data[0], null, 2));
        console.log("\n📊 STATISTIQUES:");
        console.log("Total de stations:", data.length);
        const withTemp = data.filter(s => s.t !== null).length;
        console.log("Stations avec température:", withTemp);
    }
}

analyzePackageFormat();
