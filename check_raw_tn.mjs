import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATION_ID = '59178001'; // Douai

async function checkRawValues() {
    // Fenêtre large pour le 21 Janvier (Tn)
    // On cherche le min entre le 20/01 18h UTC et le 21/01 18h UTC
    const start = new Date(Date.UTC(2026, 0, 20, 17, 0, 0));
    const end = new Date(Date.UTC(2026, 0, 21, 19, 0, 0));

    console.log(`Analyse Douai (59178001) pour Tn du 21 Janvier`);
    console.log(`Recherche du minimum entre ${start.toISOString()} et ${end.toISOString()}`);

    const { data: obs, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t')
        .eq('station_id', STATION_ID)
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp');

    if (error) { console.error(error); return; }

    console.log(`\n${obs.length} relevés trouvés :`);

    let minT = 999;
    let minTime = '';

    obs.forEach(o => {
        const time = o.timestamp.substring(11, 16);
        console.log(`  ${o.timestamp} : ${o.t} °C`);
        if (o.t !== null && o.t < minT) {
            minT = o.t;
            minTime = o.timestamp;
        }
    });

    console.log(`\n⬇️ Minimum trouvé dans la base : ${minT} °C à ${minTime}`);
    console.log(`📉 Valeur Meteociel attendue : 3.5 °C`);
}

checkRawValues();
