import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function findGaps() {
    console.log("Analyzing gaps for February 2026...");

    // Get HF stations specifically (59, 62, 80, 60, 02)
    const { data: stations, error: err1 } = await supabase
        .from('stations')
        .select('id, name')
        .or('id.like.59%,id.like.62%,id.like.80%,id.like.60%,id.like.02%');

    if (err1) { console.error(err1); return; }

    const expectedPoints = 28 * 24 * 10; // 6-minute interval = 10 pts/hr
    const results = [];

    for (const st of stations) {
        // Count actual points for Feb 2026
        const { count, error } = await supabase
            .from('observations_6mn')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', st.id)
            .gte('timestamp', '2026-02-01T00:00:00Z')
            .lte('timestamp', '2026-02-28T23:59:59Z');

        if (error) {
            console.error(`Error counting ${st.id}`, error);
            continue;
        }

        const coverage = (count || 0) / expectedPoints;
        results.push({
            id: st.id,
            name: st.name,
            count: count || 0,
            missing: Math.max(0, expectedPoints - (count || 0)),
            coverage: Number((coverage * 100).toFixed(1))
        });
    }

    results.sort((a, b) => a.coverage - b.coverage);
    const gapsOnly = results.filter(r => r.coverage < 95);

    const report = {
        title: "Report: Missing Data - February 2026 (Hauts-de-France)",
        run_date: new Date().toISOString(),
        summary: `Identified ${gapsOnly.length} stations with gaps below 95% coverage in HF.`,
        all_stations_count: results.length,
        stations_with_gaps: gapsOnly
    };

    fs.writeFileSync('./tmp/feb_gaps_report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log(`Generated report for ${gapsOnly.length} stations.`);
}
findGaps();
