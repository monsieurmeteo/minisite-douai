// Génération rapide d'un token OAuth
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function generateQuickToken() {
    console.log('🔐 Génération d\'un nouveau token...\n');

    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();

    console.log('✅ Token généré !\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('COPIEZ CE TOKEN DANS .env.local :');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`VITE_METEO_MANUAL_TOKEN=${data.access_token}\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`⏰ Ce token expire dans ${Math.floor(data.expires_in / 60)} minutes`);
    console.log(`📅 Expire à: ${new Date(Date.now() + data.expires_in * 1000).toLocaleTimeString('fr-FR')}\n`);
    console.log('💡 Pour renouveler, exécutez à nouveau: node generate_token.js\n');
}

generateQuickToken().catch(console.error);
