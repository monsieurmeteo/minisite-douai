import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicates() {
    try {
        const today = new Date().toISOString().split('T')[0];

        let allStations = [];
        let from = 0;
        const limit = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('daily_summaries')
                .select('station_id')
                .eq('date', today)
                .range(from, from + limit - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;
            allStations.push(...data);
            if (data.length < limit) break;
            from += limit;
        }

        const total = allStations.length;
        const unique = new Set(allStations.map(s => s.station_id)).size;

        console.log(`### RAPPORT DOUBLONS ${today} ###`);
        console.log(`TOTAL_LIGNES=${total}`);
        console.log(`STATIONS_UNIQUES=${unique}`);
        console.log(`DOUBLONS_NUM=${total - unique}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkDuplicates();
