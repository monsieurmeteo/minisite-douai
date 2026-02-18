const https = require('https');
const fs = require('fs');

function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });
        return env;
    } catch { return {}; }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

console.log("🚀 MEGA BOOST - REMPLISSAGE COMPLET DES 2146 STATIONS");
console.log("======================================================\n");

let cycleCount = 0;
let totalStationsProcessed = 0;

function callRobot() {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}/functions/v1/dynamic-processor`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ name: 'MegaBoost' }));
        req.end();
    });
}

async function runCycle() {
    cycleCount++;
    console.log(`\n🔄 Cycle ${cycleCount}...`);

    try {
        const result = await callRobot();
        console.log(`   ✅ ${result.message || 'OK'}`);

        // Attendre 2 secondes entre chaque appel
        await new Promise(resolve => setTimeout(resolve, 2000));

        return true;
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        return false;
    }
}

async function megaBoost() {
    console.log("Démarrage du Mega Boost...\n");
    console.log("Objectif : Remplir les 2146 stations");
    console.log("Estimation : ~40 cycles (1h30)\n");

    // Lancer 50 cycles pour être sûr d'avoir tout
    for (let i = 0; i < 50; i++) {
        const success = await runCycle();

        if (!success) {
            console.log("\n⚠️ Erreur détectée. Pause de 10 secondes...");
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        // Tous les 10 cycles, afficher un résumé
        if ((i + 1) % 10 === 0) {
            console.log(`\n📊 Progression : ${i + 1}/50 cycles complétés`);
            console.log(`   Estimation : ~${(i + 1) * 60} stations traitées`);
        }
    }

    console.log("\n🎉 MEGA BOOST TERMINÉ !");
    console.log("Vérifiez maintenant le site : toutes les stations devraient être là !");
}

megaBoost();
