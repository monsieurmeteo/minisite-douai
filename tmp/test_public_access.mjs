import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// On teste avec la clé ANON (publique), comme le site
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFrontendRPC() {
    console.log('--- TEST VISIBILITÉ PUBLIQUE ---');
    console.log('URL:', process.env.VITE_SUPABASE_URL);

    // 1. Test de l'RPC get_france_live (utilisée par la page Live)
    console.log('Appel de get_france_live...');
    const { data, error } = await supabase.rpc('get_france_live');

    if (error) {
        console.error('❌ Erreur RPC get_france_live:', error.message);
        if (error.message.includes('permission denied')) {
            console.error('   => Problème de permissions RLS');
        }
    } else {
        console.log('✅ RPC get_france_live répond.');
        console.log('Nombre d\'enregistrements renvoyés:', data?.length || 0);
        if (data && data.length > 0) {
            console.log('Exemple de donnée (le plus récent):', data[0]);
        } else {
            console.log('⚠️ L\'RPC ne renvoie rien. Vérifions si la table elle-même est accessible.');
        }
    }

    // 2. Test d'accès direct à la table
    const { data: tableData, error: tableError } = await supabase
        .from('observations_6mn')
        .select('station_id, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (tableError) {
        console.error('❌ Erreur accès direct table:', tableError.message);
    } else {
        console.log('✅ Accès direct table OK. Dernier timestamp vu par le public:', tableData[0]?.timestamp);
    }
}

testFrontendRPC();
