import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
        UPDATE daily_summaries ds
        SET rain_total = (
            SELECT COALESCE(SUM(rr_per), 0)
            FROM observations_6mn o
            WHERE o.station_id = ds.station_id
            AND o.timestamp >= ds.date::timestamp
            AND o.timestamp < (ds.date + interval '1 day')::timestamp
            AND o.rr_per > 0
        )
        WHERE ds.date >= '2026-02-01' AND ds.date <= '2026-03-31';
        `
    });
    console.log(error ? error : 'SQL Executed Successfully: ' + JSON.stringify(data));
}
run();
