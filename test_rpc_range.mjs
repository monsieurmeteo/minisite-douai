
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function testRange() {
    console.log("--- Test Pagination RPC (0-99) ---");
    const { data: d1, error: e1 } = await supabase
        .rpc('get_supervision_records')
        .range(0, 99);

    if (e1) console.error(e1);
    else console.log(`0-99: ${d1.length} lignes`);

    console.log("--- Test Pagination RPC (1000-1099) ---");
    const { data: d2, error: e2 } = await supabase
        .rpc('get_supervision_records')
        .range(1000, 1099);

    if (e2) console.error(e2);
    else console.log(`1000-1099: ${d2.length} lignes`);
}
testRange();
