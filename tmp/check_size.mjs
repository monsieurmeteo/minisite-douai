import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSize() {
    const client = new Client({
        connectionString: 'postgresql://postgres:sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR@db.ubdevaemtwbzxksjlhjg.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected!');

        const res = await client.query(`
            SELECT 
                relname AS table_name,
                pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                pg_size_pretty(pg_relation_size(relid)) AS table_size,
                pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
                reltuples::bigint AS estimated_rows
            FROM pg_catalog.pg_statio_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        `);

        console.table(res.rows);

        await client.end();
    } catch (e) {
        console.error('Error:', e.message);
        client.end();
    }
}

checkSize();
