
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function count() {
    const { count: totalData } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 4 * 3600000).toISOString());

    console.log(`Total observations last 4h: ${totalData}`);

    const { data: live } = await supabase.rpc('get_france_live');
    console.log(`Unique stations in get_france_live(): ${live?.length}`);

    let allRecs = [];
    let from = 0;
    while (true) {
        const { data } = await supabase.rpc('get_supervision_records').range(from, from + 999);
        if (!data || data.length === 0) break;
        allRecs.push(...data);
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`Stations in get_supervision_records(): ${allRecs.length}`);
}

count();
