
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function test() {
    const { data, error } = await supabase.rpc('get_supervision_records').limit(5);
    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log(`SUCCESS: Got ${data?.length} rows`);
        if (data && data.length > 0) {
            console.log("Samples:", data.map(d => d.id));
        }
    }
}
test();
