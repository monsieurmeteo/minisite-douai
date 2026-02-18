import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function check() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
        const ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

        const supabase = createClient(SUPABASE_URL, ANON_KEY);
        const { data, error } = await supabase.from('btp_projects').select('id, name');

        if (error) {
            console.error('❌ Erreur:', error.message);
            return;
        }

        console.log('--- PROJETS EN BASE ---');
        if (data.length === 0) {
            console.log('Aucun projet trouvé.');
        } else {
            data.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
        }
        console.log('-----------------------');
    } catch (e) {
        console.error('❌ Erreur script:', e.message);
    }
}

check();
