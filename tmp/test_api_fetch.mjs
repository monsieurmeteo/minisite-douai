import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function refreshToken() {
    console.log('🔄 Refreshing Token...');
    const auth = btoa(`${METEO_KEY}:${METEO_SECRET}`);
    const res = await fetch('https://portail-api.meteofrance.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) throw new Error('Token refresh failed');
    const data = await res.json();
    await supabase.from('api_secrets').upsert({
        provider: 'meteo_france',
        access_token: data.access_token,
        updated_at: new Date().toISOString()
    });
    return data.access_token;
}

async function check() {
    try {
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        let token = secrets?.access_token;
        if (!token) token = await refreshToken();

        // Check for 17:00, 17:06, 17:12, 17:18, 17:24 UTC
        const today = new Date().toISOString().split('T')[0];
        const timesToCheck = [
            '17:00:00Z', '17:06:00Z', '17:12:00Z', '17:18:00Z', '17:24:00Z', '17:30:00Z'
        ];

        for (const t of timesToCheck) {
            const dateStr = `${today}T${t}`;
            console.log(`Checking ${dateStr}...`);
            const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.status === 401) {
                token = await refreshToken();
                // retry once
                const resRetry = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                console.log(`Status (${dateStr}): ${resRetry.status}`);
                if (resRetry.ok) {
                    const data = await resRetry.json();
                    console.log(`DATA FOR ${dateStr}: Found ${data ? data.length : 0} stations`);
                }
            } else if (res.ok) {
                const data = await res.json();
                console.log(`DATA FOR ${dateStr}: Found ${data ? data.length : 0} stations`);
            } else {
                console.log(`ERROR ${dateStr}: Status ${res.status}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

check();
