
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

async function debugAuth() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("🔍 Récupération du token depuis Supabase...");
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) {
        console.error("❌ Token non trouvé !");
        return;
    }

    const endpoints = [
        { name: "Liste Stations (DPObs)", url: 'https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json' },
        { name: "Paquet 6m (DPPaquetObs)", url: 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?format=json' }
    ];

    for (const ep of endpoints) {
        console.log(`\n--- Testing ${ep.name} ---`);

        // Test with apikey
        try {
            console.log(`Trying 'apikey' header...`);
            const res = await fetch(ep.url, { headers: { 'apikey': token, 'accept': 'application/json' } });
            console.log(`Status (apikey): ${res.status}`);
            if (res.status !== 200) console.log(`Body: ${(await res.text()).substring(0, 100)}...`);
        } catch (e) { console.error(e.message); }

        // Test with Authorization: Bearer
        try {
            console.log(`Trying 'Authorization: Bearer' header...`);
            const res = await fetch(ep.url, { headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' } });
            console.log(`Status (Bearer): ${res.status}`);
            if (res.status !== 200) console.log(`Body: ${(await res.text()).substring(0, 100)}...`);
        } catch (e) { console.error(e.message); }
    }
}

debugAuth();
