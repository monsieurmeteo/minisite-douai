import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function listHdF() {
    const { data: stations, error: err1 } = await supabase
        .from('stations')
        .select('id, name')
        .or('id.like.59%,id.like.62%,id.like.80%,id.like.60%,id.like.02%');

    const stationMap = {};
    if (stations) {
        stations.forEach(s => stationMap[s.id] = s.name);
    }
    const { data, error } = await supabase
        .from('daily_summaries')
        .select('station_id, rain_total')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28');

    const totals = {};
    if (data) {
        data.forEach(d => {
            if (!totals[d.station_id]) totals[d.station_id] = 0;
            totals[d.station_id] += (d.rain_total || 0);
        });
    }
    const results = [];
    for (const [id, total] of Object.entries(totals)) {
        if (id.startsWith('59') || id.startsWith('62') || id.startsWith('80') || id.startsWith('60') || id.startsWith('02')) {
            results.push({ id, name: stationMap[id] || 'N/A', total: Number(total.toFixed(1)) });
        }
    }

    results.sort((a, b) => a.total - b.total);
    fs.writeFileSync('./tmp/hdf_rain.json', JSON.stringify(results.slice(0, 30), null, 2), 'utf8');
}
listHdF();
