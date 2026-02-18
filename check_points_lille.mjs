import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATION_ID = '59343001'; // Lille-Lesquin

async function checkPoints() {
    const startDate = "2026-01-21T00:00:00.000Z";
    const endDate = "2026-01-21T23:59:59.000Z";

    const { data: obs, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1, tx12, tn12')
        .eq('station_id', STATION_ID)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp');

    if (error) { console.error(error); return; }

    console.log(`Statistiques pour ${STATION_ID} le 21/01 (UTC range)`);
    console.log(`Nombre de points: ${obs.length}`);

    const tVals = obs.map(o => o.t).filter(v => v !== null);
    console.log(`Max T: ${Math.max(...tVals)}`);
    console.log(`Min T: ${Math.min(...tVals)}`);
    console.log(`Sum RR: ${obs.reduce((s, o) => s + (o.rr1 || 0), 0)}`);
}

checkPoints();
