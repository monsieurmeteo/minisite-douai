import pg from 'pg';
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

        console.log('Checking indexes on daily_summaries...');
        const res = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'daily_summaries';
        `);
        console.log('Indexes on daily_summaries:', res.rows);

        console.log('Checking indexes on observations_6mn...');
        const res2 = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'observations_6mn';
        `);
        console.log('Indexes on observations_6mn:', res2.rows);

        // Check if get_daily_extremes_full is slow
        console.time('Explain RPC');
        const res3 = await client.query(`
            EXPLAIN ANALYZE SELECT * FROM get_daily_extremes_full('2026-03-08');
        `);
        console.timeEnd('Explain RPC');
        console.log('EXPLAIN:', res3.rows.map(r => r['QUERY PLAN']).join('\n'));

        // Wait, why would anon access timeout? 
        // Maybe Row Level Security (RLS) is doing sequential scans on auth.uid() or something?
        // Let's check RLS policies
        console.log('Checking RLS policies on daily_summaries...');
        const res4 = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'daily_summaries';
        `);
        console.log('RLS Policies daily_summaries:', res4.rows);

        const res5 = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'observations_6mn';
        `);
        console.log('RLS Policies observations_6mn:', res5.rows);

        await client.end();
    } catch (e) {
        console.error('Error:', e.message);
        client.end();
    }
}

runSQL();
