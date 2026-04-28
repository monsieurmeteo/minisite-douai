import pg from 'pg';
const { Client } = pg;

async function performDeepClean() {
    console.log('🧹 DÉBUT DU GRAND MÉNAGE SUPABASE (Mode IP Directe)...');

    const client = new Client({
        // Connexion directe via IPv6 pour éviter les erreurs DNS
        host: '2a05:d018:135e:1662:180f:a86e:74b3:d3fa',
        port: 5432,
        user: 'postgres',
        password: 'Meteoclimatpro',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connecté à la base de données !');

        console.log('⏳ Nettoyage de observations_6mn (Verrouillage de la table environ 5-10 min)...');
        await client.query('VACUUM FULL ANALYZE observations_6mn;');
        console.log('✅ Table observations_6mn compactée !');

        console.log('⏳ Nettoyage de daily_summaries...');
        await client.query('VACUUM FULL ANALYZE daily_summaries;');
        console.log('✅ Table daily_summaries compactée !');

        console.log('✨ TOUT EST PROPRE : Votre base de données est optimisée.');

    } catch (e) {
        console.error('❌ ERREUR :', e.message);
    } finally {
        await client.end();
    }
}

performDeepClean();
