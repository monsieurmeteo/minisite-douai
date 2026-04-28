import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('vigilance_bulletins')
        .select('*')
        .eq('domain_id', 'france')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Bulletin France Update Time:', data?.[0]?.update_time);
    }
}

check();
