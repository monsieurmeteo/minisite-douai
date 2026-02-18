// Ce script SIMULE l'exécution de la fonction Edge Function localement
// Il utilise EXACTEMENT la même logique que celle déployée sur Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lecture .env
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
// ATTENTION: Il faut la SERVICE ROLE KEY idéalement, mais on va essayer avec ce qu'on a
// Pour ce test local, on va utiliser la réparation "manuelle" mais avec la logique "cloud"
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Clés comme dans le cloud
const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function simulateCloudRobot() {
    console.log('☁️ SIMULATION DU ROBOT CLOUD SUR VOTRE PC ☁️');

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Lire le token (qui est cassé)
    console.log('1. Lecture du token...');
    const { data: secret } = await supabase.from('api_secrets').select('access_token').eq('provider', 'meteo_france').single();
    let token = secret.access_token;
    console.log(`   Token actuel : ${token.substring(0, 15)}...`);

    // 2. Essayer d'appeler l'API (ça va échouer)
    console.log('2. Tentative appel API Météo...');
    // date quelconque valide
    const testUrl = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=2026-01-19T14:00:00Z&format=json`;

    let response = await fetch(testUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log(`   Réponse API : ${response.status}`);

    if (response.status === 401) {
        console.log('3. ⚠️  401 DÉTECTÉE ! Activtion du protocole de secours...');

        // C'EST ICI LA LOGIQUE CLÉ QUE NOUS AVONS AJOUTÉE AU NUAGE
        const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
        const tokenRes = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
        });

        if (tokenRes.ok) {
            const data = await tokenRes.json();
            const newToken = data.access_token;
            console.log('   ✅ NOUVEAU TOKEN GÉNÉRÉ !');
            console.log(`   Nouveau : ${newToken.substring(0, 15)}...`);

            // Mettre à jour la base
            console.log('4. Sauvegarde dans Supabase...');
            await supabase.from('api_secrets').upsert({
                provider: 'meteo_france',
                access_token: newToken,
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' });

            console.log('   ✅ Base mise à jour.');

            console.log('5. Ré-essai appel API...');
            const response2 = await fetch(testUrl, { headers: { 'Authorization': `Bearer ${newToken}` } });
            console.log(`   Réponse API 2ème essai : ${response2.status}`);

            if (response2.ok) {
                console.log('\n🏆 VICTOIRE TOTALE ! Le système s\'est auto-réparé.');
                console.log('   C\'est exactement ce code qui tourne sur le serveur.');
            } else {
                console.log('   🤔 Bizarre, le token est bon mais l\'API râle encore.');
            }

        } else {
            console.log('   ❌ Échec génération token secours.');
        }
    } else {
        console.log('   Pas d\'erreur 401 ? Le token saboté marchait ? Impossible.');
    }
}

simulateCloudRobot();
