import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function runSQL() {
    console.log('Connecting to database...');
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
        const sql = fs.readFileSync('supabase/migrations/20260408163000_fix_rpcs_for_maps.sql', 'utf8');
        await client.query(sql);
        console.log('SUCCESS: RPCs Updated correctly.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

runSQL();
