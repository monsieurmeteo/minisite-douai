import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function sabotageToken() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('😈 SABOTAGE DU TOKEN EN COURS...');

    // On met un faux token pour simuler une expiration
    const { error } = await supabase
        .from('api_secrets')
        .upsert({
            provider: 'meteo_france',
            access_token: 'TOKEN_INVALIDE_POUR_TESTER_LA_REPARATION_AUTO',
            updated_at: new Date().toISOString()
        }, { onConflict: 'provider' });

    if (error) {
        console.error('❌ Échec du sabotage :', error.message);
    } else {
        console.log('✅ Token saboté ! Le prochain appel API échouera avec une 401.');
    }
}

sabotageToken();
