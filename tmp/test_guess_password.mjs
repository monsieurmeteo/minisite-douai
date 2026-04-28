import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function testPassword() {
    console.log('--- TEST DE CONNEXION DIRECTE (Port 6543) ---');
    const client = new Client({
        host: 'db.ubdevaemtwbzxksjlhjg.supabase.co',
        port: 6543,
        user: 'postgres',
        password: 'Meteoclimatpro',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ CONNEXION RÉUSSIE !');

        // On en profite pour faire un petit nettoyage des IDs bizarres
        console.log('Nettoyage des IDs invalides...');
        const res1 = await client.query("DELETE FROM daily_summaries WHERE length(station_id) != 8;");
        console.log(`Purger ${res1.rowCount} lignes de daily_summaries (ID invalides).`);

        const res2 = await client.query("DELETE FROM observations_6mn WHERE length(station_id) != 8;");
        console.log(`Purger ${res2.rowCount} lignes de observations_6mn (ID invalides).`);

        await client.end();
        console.log('--- NETTOYAGE TERMINÉ ---');
    } catch (e) {
        console.error('❌ Échec de connexion :', e.message);
        client.end();
    }
}

testPassword();
