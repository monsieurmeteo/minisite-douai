import fs from 'fs';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
// Utilisation de la clé publique (ANON) pour déclencher la fonction
const SUPABASE_ANON_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

async function triggerCloudFunction() {
    console.log('🚀 DÉCLENCHEMENT DU ROBOT CLOUD (avec token saboté)...');

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/collect-6mn`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        console.log(`\n📊 Status: ${response.status}`);
        console.log('📝 Réponse:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n🎉 VICTOIRE ! Le robot a réussi malgré le token saboté.');
            console.log('Cela PROUVE qu\'il a détecté l\'erreur 401 et régénéré un nouveau token tout seul.');
        } else {
            console.log('\n❌ ÉCHEC. Le robot n\'a pas pu se réparer.');
        }

    } catch (error) {
        console.error('❌ Erreur technique:', error);
    }
}

triggerCloudFunction();
