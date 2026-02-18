import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATION_ID = '59343001'; // Lille-Lesquin
const TEST_MONTH = 0; // Janvier
const TEST_YEAR = 2026;

console.log(`🔍 Diagnostic GROUND TRUTH vs DB pour ${STATION_ID} (Lille)\n`);

async function diagnose() {
    const startDate = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, 19, 0, 0, 0));
    const endDate = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, 27, 23, 59, 59));

    const { data: obs, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1, tx12, tn12')
        .eq('station_id', STATION_ID)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp');

    if (error) { console.error(error); return; }

    // Simulation de l'agrégat LOCAL 00h-24h
    for (let d = 20; d <= 25; d++) {
        const startDay = new Date(TEST_YEAR, TEST_MONTH, d, 0, 0, 0);
        const endDay = new Date(TEST_YEAR, TEST_MONTH, d, 23, 59, 59);

        const dayObs = obs.filter(o => {
            const t = new Date(o.timestamp);
            return t >= startDay && t <= endDay;
        });

        const tVals = dayObs.map(o => o.t).filter(v => v !== null);
        const tx = tVals.length ? Math.max(...tVals) : null;
        const tn = tVals.length ? Math.min(...tVals) : null;
        const rr = dayObs.reduce((sum, o) => sum + (o.rr1 || 0), 0);

        console.log(`DATE ${d}/01 -> Tx=${tx} Tn=${tn} RR=${rr.toFixed(1)} (count: ${dayObs.length})`);
    }
}

// Bornes OMM
// Tx: J 06h UTC -> J+1 06h UTC
const startTx = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d, 6, 0, 0));
const endTx = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d + 1, 6, 0, 0));

// Tn: J-1 18h UTC -> J 18h UTC
const startTn = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d - 1, 18, 0, 0));
const endTn = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d, 18, 0, 0));

// Pluie: J 06h UTC -> J+1 06h UTC
const startRr = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d, 6, 0, 0));
const endRr = new Date(Date.UTC(TEST_YEAR, TEST_MONTH, d + 1, 6, 0, 0));

console.log(`  🕒 Fenêtre Tx : ${startTx.toISOString().substring(5, 16).replace('T', ' ')} -> ${endTx.toISOString().substring(5, 16).replace('T', ' ')}`);

// Filtrage
const txVals = obs.filter(o => {
    const t = new Date(o.timestamp).getTime();
    return t > startTx.getTime() && t <= endTx.getTime();
}).map(o => o.t);

const tnVals = obs.filter(o => {
    const t = new Date(o.timestamp).getTime();
    return t > startTn.getTime() && t <= endTn.getTime();
}).map(o => o.t);

const rrVals = obs.filter(o => {
    const t = new Date(o.timestamp).getTime();
    return t > startRr.getTime() && t <= endRr.getTime();
}).map(o => o.rr1);

const tx = txVals.length ? Math.max(...txVals) : 'N/A';
const tn = tnVals.length ? Math.min(...tnVals) : 'N/A';
const rr = rrVals.reduce((a, b) => a + (b || 0), 0);

console.log(`  🌡️  Tx calculée : ${tx} °C  (sur ${txVals.length} obs)`);
console.log(`  ❄️  Tn calculée : ${tn} °C  (sur ${tnVals.length} obs)`);
console.log(`  💧 Pluie calculée : ${rr.toFixed(1)} mm`);

// Affichage ULTRA compact
console.log(`RESULT: ID=${STATION_ID} DATE=${d}/${TEST_MONTH + 1} Tx=${tx} Tn=${tn} RR=${rr.toFixed(1)}`);
    }
}

diagnose();
