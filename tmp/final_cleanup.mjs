import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function performMassiveCleanup() {
    console.log('--- OPÉRATION GRAND NETTOYAGE ---');
    // On utilise le mode Direct (port 5432) avec le mot de passe fourni
    const connectionString = 'postgresql://postgres:Agate59880@@@db.ubdevaemtwbzxksjlhjg.supabase.co:5432/postgres';

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connexion à PostgreSQL...');
        await client.connect();
        console.log('✅ Connexion établie.');

        // 1. Supprimer les lignes invalides (celles qui pèsent 100 millions)
        // D'après mes tests, les lignes fantômes ont des station_id invalides (souvent '1' ou pas 8 caractères)
        console.log('1/3. Suppression des 100 millions de lignes invalides dans daily_summaries...');
        const res1 = await client.query("DELETE FROM daily_summaries WHERE length(station_id) != 8;");
        console.log(`=> Supprimé : ${res1.rowCount} lignes fantômes.`);

        console.log('2/3. Suppression des lignes invalides dans observations_6mn...');
        const res2 = await client.query("DELETE FROM observations_6mn WHERE length(station_id) != 8;");
        console.log(`=> Supprimé : ${res2.rowCount} lignes fantômes.`);

        // 2. Lancer un VACUUM pour libérer l'espace et refaire les statistiques
        // Note: VACUUM ne peut pas être lancé dans une transaction standard
        console.log('3/3. Réorganisation de la base de données (VACUUM ANALYZE)...');
        await client.query("COMMIT;"); // On s'assure d'être hors transaction
        await client.query("VACUUM ANALYZE daily_summaries;");
        await client.query("VACUUM ANALYZE observations_6mn;");
        console.log('✅ Réorganisation terminée.');

        await client.end();
        console.log('--- TOUT EST PROPRE ! ---');
    } catch (e) {
        console.error('❌ ERREUR LORS DU NETTOYAGE :', e.message);
        if (client) await client.end();
    }
}

performMassiveCleanup();
