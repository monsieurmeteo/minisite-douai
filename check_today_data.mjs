
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function check() {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today);

    console.log(`Count for today (${today}): ${count}`);

    const { data: test } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);
    console.log(`Latest timestamp in DB: ${test?.[0]?.timestamp}`);
}
check();
