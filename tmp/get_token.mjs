import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function getToken() {
    const { data, error } = await supabase.from('api_secrets').select('access_token').eq('provider', 'meteo_france').single();
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(data.access_token);
    }
}

getToken();
