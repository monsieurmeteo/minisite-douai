const { Client } = require('pg');

async function vacuumDB() {
    const client = new Client({
        host: 'db.ubdevaemtwbzxksjlhjg.supabase.co',
        port: 6543, // Pooler port for Supabase
        user: 'postgres',
        password: 'Meteoclimatpro',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Postgres via pooler...');
        await client.connect();

        console.log('Running VACUUM ANALYZE on observations_6mn...');
        // Need to run VACUUM outside a transaction
        await client.query('VACUUM ANALYZE observations_6mn;');
        console.log('✅ observations_6mn vacuumed.');

        console.log('Running VACUUM ANALYZE on observations_horaire...');
        await client.query('VACUUM ANALYZE observations_horaire;');
        console.log('✅ observations_horaire vacuumed.');

        await client.end();
        console.log('--- ALL VACUUMS DONE ---');
    } catch (e) {
        console.error('❌ Connection or Query Error:', e.message);
        client.end();
    }
}

vacuumDB();
