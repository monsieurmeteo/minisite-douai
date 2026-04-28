import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkBad() {
    // get count of station_ids shorter than 8 chars
    const { data: d, count } = await s.from('daily_summaries')
        .select('station_id', { count: 'exact' });

    if (d) {
        const invalid = d.filter(x => x.station_id.length !== 8);
        console.log(`Total invalid station_ids: ${invalid.length}`);
        if (invalid.length > 0) {
            console.log(`Examples: `, invalid.slice(0, 5));
        }
    } else {
        console.log("No data fetched?");
    }
}

checkBad();
