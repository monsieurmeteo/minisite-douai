import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function manualTest() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;

    console.log('🔍 Test manuel de l\'API avec le nouveau token\n');

    // Test with current time minus different delays
    const now = new Date();
    const tests = [
        { minutes: 30, label: '30 min de délai' },
        { minutes: 60, label: '1h de délai' },
        { minutes: 120, label: '2h de délai' },
        { minutes: 180, label: '3h de délai' }
    ];

    for (const test of tests) {
        const testTime = new Date(now);
        testTime.setMinutes(Math.floor(testTime.getMinutes() / 6) * 6, 0, 0);
        testTime.setMinutes(testTime.getMinutes() - test.minutes);
        const testTimeStr = testTime.toISOString().split('.')[0] + 'Z';

        console.log(`\n📅 Test: ${testTimeStr} (${test.label})`);

        try {
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${testTimeStr}&format=json`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log(`   Status: ${res.status}`);

            if (res.ok) {
                const data = await res.json();
                console.log(`   ✅ ${data.length} stations récupérées`);

                if (data.length > 0) {
                    const sample = data[0];
                    console.log(`   Exemple: ${sample.id || sample.geo_id_insee}`);
                    console.log(`            validity_time: ${sample.validity_time}`);
                }
            } else {
                const text = await res.text();
                console.log(`   ❌ Erreur: ${text.substring(0, 200)}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }
    }
}

manualTest();
