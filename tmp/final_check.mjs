import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkFinalState() {
    console.log('--- VÉRIFICATION FINALE ---');

    const { data: d6 } = await supabase.from('observations_6mn').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    console.log('Dernier relevé 6mn :', d6?.[0]?.timestamp || 'Aucun');

    const { data: dh } = await supabase.from('observations_horaire').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    console.log('Dernier relevé horaire :', dh?.[0]?.timestamp || 'Aucun');

    console.log('---------------------------');
}

checkFinalState();
