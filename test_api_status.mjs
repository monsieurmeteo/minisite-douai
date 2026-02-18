import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testAPI() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get token
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) {
        console.error('❌ Token non trouvé dans Supabase');
        return;
    }

    console.log('✅ Token récupéré:', token.substring(0, 20) + '...\n');
    console.log('🔍 Test de l\'API Météo-France...\n');
    console.log('='.repeat(70));

    const now = new Date();

    // Test different time cycles
    const testCycles = [
        { delay: 20, label: '20 min' },
        { delay: 30, label: '30 min' },
        { delay: 40, label: '40 min' },
        { delay: 50, label: '50 min' },
        { delay: 60, label: '1 heure' },
        { delay: 90, label: '1h30' },
        { delay: 120, label: '2 heures' }
    ];

    for (const test of testCycles) {
        const testTime = new Date(now);
        testTime.setMinutes(Math.floor(testTime.getMinutes() / 6) * 6, 0, 0);
        testTime.setMinutes(testTime.getMinutes() - test.delay);
        const testTimeStr = testTime.toISOString().split('.')[0] + 'Z';

        process.stdout.write(`[${test.label.padEnd(8)}] ${testTimeStr} ... `);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${testTimeStr}&format=json`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`✅ ${data.length} stations`);

                if (test.delay === 30) {
                    // Show sample data
                    if (data.length > 0) {
                        const sample = data[0];
                        console.log(`   Exemple: Station ${sample.id || sample.geo_id_insee}`);
                        console.log(`            Temp: ${sample.t ? (sample.t - 273.15).toFixed(1) : 'N/A'}°C`);
                        console.log(`            Vent: ${sample.ff ? (sample.ff * 3.6).toFixed(0) : 'N/A'} km/h`);
                    }
                }
            } else {
                const errorText = await res.text();
                console.log(`❌ HTTP ${res.status}`);
                if (res.status === 401) {
                    console.log('   ⚠️  Problème d\'authentification - Token invalide ou expiré');
                } else if (res.status === 404) {
                    console.log('   ℹ️  Données pas encore disponibles pour ce cycle');
                } else if (res.status === 429) {
                    console.log('   ⚠️  Rate limit atteint');
                } else {
                    console.log(`   Erreur: ${errorText.substring(0, 100)}`);
                }
            }
        } catch (error) {
            console.log(`❌ Erreur: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('='.repeat(70));
    console.log('\n🔍 Test de l\'endpoint HORAIRE...\n');

    // Test hourly endpoint
    const hourTime = new Date(now);
    hourTime.setMinutes(0, 0, 0);
    hourTime.setHours(hourTime.getHours() - 2);
    const hourTimeStr = hourTime.toISOString().split('.')[0] + 'Z';

    try {
        const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${hourTimeStr}&format=json`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Horaire ${hourTimeStr}: ${data.length} stations`);
        } else {
            console.log(`❌ Horaire ${hourTimeStr}: HTTP ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ Erreur horaire: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(70));
    console.log('Si vous voyez des ✅ : L\'API fonctionne correctement');
    console.log('Si vous voyez des ❌ 401 : Le token est expiré, il faut le renouveler');
    console.log('Si vous voyez des ❌ 404 : Les données ne sont pas encore publiées');
    console.log('Si vous voyez des ❌ 429 : Trop de requêtes, attendez quelques minutes');
}

testAPI();
