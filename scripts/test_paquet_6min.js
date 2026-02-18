
import fs from 'fs';
import path from 'path';

// Load token
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const tokenMatch = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);

if (!tokenMatch) { process.exit(1); }
const token = tokenMatch[1].trim();

async function testPaquet() {
    console.log("📦 Test API Paquet (6min) avec le Token...");

    // URL paquet 6min (Date obligatoire, format ISO8601 UTC sans minutes ?)
    // Exemple format attendu : 2026-01-19T08:00:00Z
    const now = new Date();
    // On recule de 30 min pour être sûr d'avoir des data
    now.setMinutes(now.getMinutes() - 30);
    // Arrondi aux 6 minutes inférieures (0, 6, 12, ... 54)
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 6) * 6;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);

    const dateStr = now.toISOString().split('.')[0] + 'Z';

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;

    // Note: L'API paquet demande souvent Bearer
    try {
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        console.log(`Status: ${resp.status}`);
        if (resp.ok) {
            const data = await resp.json();
            console.log(`✅ SUCCÈS ! ${data.length} stations reçues d'un coup.`);
            console.log("Exemple:", data[0]);
        } else {
            console.log("❌ Echec Paquet. Essai avec header 'apikey'...");
            // Retry with apikey header just in case
            const resp2 = await fetch(url, { headers: { 'apikey': token } });
            console.log(`Status (apikey): ${resp2.status}`);
            if (resp2.ok) console.log("✅ SUCCÈS avec header apikey !");
            else console.log(await resp2.text());
        }
    } catch (e) {
        console.error(e);
    }
}

testPaquet();
