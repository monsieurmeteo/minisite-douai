
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function check() {
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .eq('station_id', '59606004')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
check();
