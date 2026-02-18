
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function debug() {
    console.log("🔍 Recherche de Douai (59178001) et Valenciennes (59606004) dans toute la base...");

    // 1. Check observations_6mn
    const { data: obs } = await supabase
        .from('observations_6mn')
        .select('*')
        .in('station_id', ['59178001', '59606004'])
        .order('timestamp', { ascending: false })
        .limit(2);

    console.log("\n📡 Dernières observations (observations_6mn) :");
    console.log(JSON.stringify(obs, null, 2));

    // 2. Check get_france_live
    const { data: live } = await supabase.rpc('get_france_live');
    const liveMatch = live?.filter(s => ['59178001', '59606004'].includes(s.station_id));
    console.log("\n🗺️  Dans get_france_live() :");
    console.log(JSON.stringify(liveMatch, null, 2));

    // 3. Check get_supervision_records with full pull (pagination)
    let all = [];
    let from = 0;
    while (true) {
        const { data } = await supabase.rpc('get_supervision_records').range(from, from + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
        from += 1000;
    }
    const supMatch = all.filter(s => ['59178001', '59606004'].includes(s.id));
    console.log(`\n📊 Dans get_supervision_records() [Total: ${all.length} stations] :`);
    console.log(JSON.stringify(supMatch, null, 2));
}

debug();
