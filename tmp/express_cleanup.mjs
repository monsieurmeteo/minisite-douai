import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;

// Les différentes variantes de connexion Supabase
const configs = [
    {
        name: 'Direct IPv6/IPv4',
        connectionString: 'postgresql://postgres:Agate59880%40%40@db.ubdevaemtwbzxksjlhjg.supabase.co:5432/postgres'
    },
    {
        name: 'Session Pooler',
        connectionString: 'postgresql://postgres.ubdevaemtwbzxksjlhjg:Agate59880%40%40@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
    },
    {
        name: 'Transaction Pooler',
        connectionString: 'postgresql://postgres.ubdevaemtwbzxksjlhjg:Agate59880%40%40@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
    }
];

async function tryCleanup() {
    let connectedClient = null;

    for (const config of configs) {
        console.log(`Tentative de connexion via : ${config.name}...`);
        const client = new Client({
            connectionString: config.connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
        });

        try {
            await client.connect();
            console.log(`✅ Connecté via ${config.name} !`);
            connectedClient = client;
            break;
        } catch (e) {
            console.error(`❌ Échec ${config.name}: ${e.message}`);
            await client.end().catch(() => { });
        }
    }

    if (!connectedClient) {
        console.error("Impossible de se connecter à la base de données. Vérifiez si l'hôte est joignable.");
        return;
    }

    try {
        console.log("Démarrage du grand ménage...");

        // On cible d'abord station_id = '1' qui semble être le plus gros doublon
        console.log("Suppression des entrées avec station_id='1' (le plus gros bloc)...");
        // On fait ça par étapes pour ne pas bloquer le log de transaction
        let totalDeleted = 0;
        let deletedInBatch = 1;

        while (deletedInBatch > 0) {
            const res = await connectedClient.query("WITH target AS (SELECT ctid FROM daily_summaries WHERE station_id = '1' LIMIT 50000) DELETE FROM daily_summaries WHERE ctid IN (SELECT ctid FROM target);");
            deletedInBatch = res.rowCount;
            totalDeleted += deletedInBatch;
            console.log(`-> Purge en cours : ${totalDeleted} lignes supprimées...`);
            if (totalDeleted > 1000000) break; // On s'arrête à 1M pour ce test
        }

        console.log("Suppression des station_id invalides (longueur != 8)...");
        const res2 = await connectedClient.query("DELETE FROM daily_summaries WHERE length(station_id) != 8;");
        console.log(`-> Supprimé : ${res2.rowCount} IDs invalides.`);

        const res3 = await connectedClient.query("DELETE FROM observations_6mn WHERE length(station_id) != 8;");
        console.log(`-> Supprimé : ${res3.rowCount} observations invalides.`);

        console.log("Optimisation de la base (ANALYZE)...");
        await connectedClient.query("ANALYZE daily_summaries;");
        await connectedClient.query("ANALYZE observations_6mn;");

        console.log("✨ Opération réussie !");
    } catch (err) {
        console.error("Erreur durant le nettoyage:", err.message);
    } finally {
        await connectedClient.end();
    }
}

tryCleanup();
