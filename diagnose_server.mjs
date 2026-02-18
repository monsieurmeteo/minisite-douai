import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function diagnose() {
    console.log('🕵️‍♂️ DIAGNOSTIC DU SERVEUR SUPABASE (CLOUD)...');

    const url = `${SUPABASE_URL}/functions/v1/collect-6mn`;
    console.log(`📡 Connexion à : ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({})
        });

        const status = response.status;
        const text = await response.text();

        console.log(`\n📊 Status: ${status}`);
        console.log(`📝 Réponse du serveur :`);
        console.log('------------------------------------------------');
        console.log(text);
        console.log('------------------------------------------------');

        if (status === 200) {
            console.log('\n✅ LE SERVEUR FONCTIONNE ! (L\'erreur précédente était peut-être temporaire)');
        } else {
            console.log('\n❌ ERREUR DÉTECTÉE.');
            if (text.includes('api_secrets')) {
                console.log('👉 Problème : Le serveur n\'arrive pas à lire la table des secrets.');
            } else if (text.includes('Authorization')) {
                console.log('👉 Problème : La clé d\'autorisation est refusée.');
            }
        }

    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
    }
}

diagnose();
