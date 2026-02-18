import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkTokenStatus() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('🕵️‍♂️ INSPECTION DU TOKEN DANS LA BASE...');

    const { data: secret } = await supabase
        .from('api_secrets')
        .select('access_token, updated_at')
        .eq('provider', 'meteo_france')
        .single();

    if (secret) {
        console.log(`🔑 Token actuel : ${secret.access_token.substring(0, 20)}...`);
        console.log(`📅 Mis à jour à : ${secret.updated_at}`);

        if (secret.access_token === 'TOKEN_INVALIDE_POUR_TESTER_LA_REPARATION_AUTO') {
            console.log('\n❌ RÉSULTAT : Le token est TOUJOURS CASSÉ.');
            console.log('   Le robot n\'est pas encore passé ou n\'a pas pu le réparer.');
        } else {
            console.log('\n✅ RÉSULTAT : Le token a été RÉPARÉ !');
            console.log('   Un robot (local ou distant) a fait le travail.');
        }
    }
}

checkTokenStatus();
