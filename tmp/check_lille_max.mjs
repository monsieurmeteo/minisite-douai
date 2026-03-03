
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findLilleActualMax() {
    const sid = '59343001';
    console.log(`Checking Feb 2026 for ${sid}...`);

    const weeks = [
        ['2026-02-01', '2026-02-08'],
        ['2026-02-08', '2026-02-15'],
        ['2026-02-15', '2026-02-22'],
        ['2026-02-22', '2026-02-28']
    ];

    let overallMax = { fxi: 0, timestamp: '' };

    for (const [start, end] of weeks) {
        process.stdout.write(`Checking ${start} to ${end}... `);
        const { data, error } = await supabase
            .from('observations_6mn')
            .select('timestamp, fxi')
            .eq('station_id', sid)
            .gte('timestamp', `${start}T00:00:00Z`)
            .lte('timestamp', `${end}T23:59:59Z`)
            .not('fxi', 'is', null)
            .order('fxi', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error:', error);
            continue;
        }

        if (data && data[0]) {
            console.log(`Max: ${data[0].fxi} km/h`);
            if (data[0].fxi > overallMax.fxi) {
                overallMax = data[0];
            }
        } else {
            console.log('No data');
        }
    }

    console.log(`OVERALL MAX FOR FEBRUARY: ${overallMax.fxi} km/h at ${overallMax.timestamp}`);
}

findLilleActualMax();
