import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATION_ID = '59343001';
const TEST_MONTH = 0;
const TEST_YEAR = 2026;

async function testAggregation() {
    const startDate = new Date(TEST_YEAR, TEST_MONTH, 1);
    const endDate = new Date(TEST_YEAR, TEST_MONTH + 1, 0, 23, 59, 59);
    const fetchStart = new Date(startDate); fetchStart.setDate(fetchStart.getDate() - 1);
    const fetchEnd = new Date(endDate); fetchEnd.setDate(fetchEnd.getDate() + 1);

    const { data: obs, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1')
        .eq('station_id', STATION_ID)
        .gte('timestamp', fetchStart.toISOString())
        .lte('timestamp', fetchEnd.toISOString())
        .order('timestamp');

    if (error) { console.error(error); return; }

    const daysInMonth = new Date(TEST_YEAR, TEST_MONTH + 1, 0).getDate();

    console.log(`AGGREGATION RESULTS FOR LILLE (${STATION_ID}) JAN 2026`);

    for (let d = 1; d <= daysInMonth; d++) {
        const start = new Date(TEST_YEAR, TEST_MONTH, d, 0, 0, 0);
        const end = new Date(TEST_YEAR, TEST_MONTH, d, 23, 59, 59);

        const dayObs = obs.filter(o => {
            const t = new Date(o.timestamp);
            return t >= start && t <= end;
        });

        const hasTemp = dayObs.some(o => o.t !== null);
        const isValid = (dayObs.length >= 18) || hasTemp;

        let tx = null, tn = null, rr = 0;
        if (isValid) {
            const tVals = dayObs.map(o => o.t).filter(v => v !== null);
            tx = tVals.length > 0 ? Math.max(...tVals) : null;
            tn = tVals.length > 0 ? Math.min(...tVals) : null;
            rr = dayObs.reduce((sum, o) => sum + (o.rr1 || 0), 0);
        }

        if (d >= 20 && d <= 25) {
            console.log(`D${d}: Valid=${isValid} Points=${dayObs.length} Tx=${tx} Tn=${tn} RR=${rr.toFixed(1)}`);
        }
    }
}

testAggregation();
