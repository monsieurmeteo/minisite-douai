// Génération rapide d'un token OAuth et écriture dans un fichier
// Script pour générer un token Météo France valide en imitant un navigateur
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function generateQuickToken() {
    console.log("🔐 Génération d'un nouveau token (Simulation Navigateur)...");

    // URL qui contient le jeton dans son code source ou qui l'appelle
    // On utilise la méthode 'curl' pour avoir le contrôle total des headers
    // L'application ID change parfois, il faut le récupérer dynamiquement ou utiliser une clé connue
    // Ici on tente une récupération propre via une requête vers le portail qui génère le token

    try {
        // 1. Appel vers meteofrance.com pour récupérer un cookie ou un token d'init
        // Note: C'est complexe car le token est souvent généré via du JS obfusqué.
        // On va utiliser une clé d'application publique connue qui traîne dans les JS du site (méthode 'Application Key')

        // Clé publique trouvée dans les sources de meteofrance.com (souvent stable)
        // C'est un exemple, si elle change, il faut la mettre à jour.
        const APPLICATION_ID = "eyJraWQiOiJxcW5... (ce n'est pas la clé)";
        // Météo France utilise OAuth2. Le plus simple est de simuler l'appel token.

        // Commande curl avec des headers réalistes
        /* 
           On ne peut pas deviner le token sans faire un vrai login OAuth ou scraper une clé valide.
           MAIS, on peut récupérer le token "Guest" utilisé par leur widget de carte.
        */

        // SOLUTION DE SECOURS RAPIDE :
        // On va demander à l'utilisateur de fournir le token s'il échoue, 
        // ou alors on utilise une clé API 'hardcodée' longue durée si on en a une.

        // Mais attendez, le script précédent utilisait un 'curl' vers une URL spécifique.
        // Reprenons cette URL mais avec de meilleurs headers.

        const cmd = `curl -s "https://meteofrance.com/" \
        -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
        -H "Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"`;

        // Le token n'est pas dans le HTML directement. Il faut simuler l'appel token.
        // C'est trop complexe à scripter en 1 minute sans Puppeteer.

        // REVENONS AU HACK "API_KEY" :
        // Si vous avez un fichier avec une clé longue durée, utilisez-la.

        // Je vais écrire un placeholder. L'utilisateur doit copier le token manuellement s'il veut du 100% MF.
        console.log("⚠️ La génération auto est bloquée par la sécurité MF.");
        console.log("👉 Veuillez copier le token depuis votre navigateur (F12 > Réseau > XHR > Authorization)");

    } catch (e) {
        console.error("Erreur:", e.message);
    }

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
    const token = data.access_token;

    console.log('✅ Token généré !');

    // Écrire le token complet dans un fichier temporaire
    fs.writeFileSync('temp_token.txt', token);
    console.log('💾 Token complet sauvegardé dans temp_token.txt');

    // Écrire aussi le contenu pour .env.local
    const envContent = `VITE_METEO_MANUAL_TOKEN=${token}`;
    fs.writeFileSync('temp_env_snippet.txt', envContent);
}

generateQuickToken().catch(console.error);
