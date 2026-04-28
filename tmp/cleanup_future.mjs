import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function cleanupFutureData() {
    const now = new Date().toISOString();
    console.log(`Nettoyage des données postérieures à : ${now}`);

    // Nettoyage 6mn
    const { count: count6mn, error: err6mn } = await supabase
        .from('observations_6mn')
        .delete({ count: 'exact' })
        .gt('timestamp', now);

    if (err6mn) console.error('Erreur nettoyage 6mn:', err6mn.message);
    else console.log(`✅ ${count6mn} enregistrements futurs supprimés dans observations_6mn`);

    // Nettoyage horaire
    const { count: countH, error: errH } = await supabase
        .from('observations_horaire')
        .delete({ count: 'exact' })
        .gt('timestamp', now);

    if (errH) console.error('Erreur nettoyage horaire:', errH.message);
    else console.log(`✅ ${countH} enregistrements futurs supprimés dans observations_horaire`);
}

cleanupFutureData();
