
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testFetch() {
    let output = "";
    // Check table count
    const { count, error: countErr } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        output += "Error: " + countErr.message + "\n";
    } else {
        output += "Total strikes: " + count + "\n";
    }

    const { data } = await supabase.from('lightning_strikes').select('*').limit(3).order('strike_time', { ascending: false });
    output += "Recent samples:\n" + JSON.stringify(data, null, 2);

    fs.writeFileSync('db_status.txt', output);
}

testFetch();
