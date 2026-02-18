
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function check() {
    console.log("--- Vérification Climatologie (station_climatology) ---");
    const { data: v, error: ev } = await supabase
        .from('station_climatology')
        .select('station_id, name')
        .in('station_id', ['59178001', '59606004']);

    if (ev) console.error(ev);
    else console.log("Stations trouvées dans station_climatology:", v);

    console.log("\n--- Vérification appel RPC get_supervision_records ---");
    const { data: rpc, error: erpc } = await supabase
        .rpc('get_supervision_records');

    if (erpc) console.error(erpc);
    else {
        const matching = rpc.filter(r => ['59178001', '59606004'].includes(r.id));
        console.log(`Nombre total retourné par RPC: ${rpc.length}`);
        console.log("Stations trouvées dans le retour RPC:", matching.map(m => m.id));
    }
}
check();
