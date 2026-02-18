import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATION_ID = '59343001'; // Lille-Lesquin
const TEST_MONTH = 0; // Janvier
const TEST_YEAR = 2026;

async function diagnose() {
    console.log(`🔍 Diagnostic GROUND TRUTH vs DB for ${STATION_ID} (Lille)\n`);

    // We fetch a range to be safe
    const startDate = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, 19, 0, 0, 0));
    const endDate = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, 27, 23, 59, 59));

    const { data: obs, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1')
        .eq('station_id', STATION_ID)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp');

    if (error) { console.error(error); return; }

    console.log(`Période demandée : 20/01 au 25/01\n`);

    for (let d = 20; d <= 25; d++) {
        // LOCAL WINDOW 00h-24h
        const start = new Date(TEST_YEAR, TEST_MONTH, d, 0, 0, 0).getTime();
        const end = new Date(TEST_YEAR, TEST_MONTH, d, 23, 59, 59).getTime();

        const dayObs = obs.filter(o => {
            const t = new Date(o.timestamp).getTime();
            return t >= start && t <= end;
        });

        const tVals = dayObs.map(o => o.t).filter(v => v !== null);
        const tx = tVals.length ? Math.max(...tVals) : null;
        const tn = tVals.length ? Math.min(...tVals) : null;
        const rr = dayObs.reduce((sum, o) => sum + (o.rr1 || 0), 0);

        console.log(`DATE ${d}/01 -> Tx=${tx} Tn=${tn} RR=${rr.toFixed(1)} (points: ${dayObs.length})`);
    }
}

diagnose();
