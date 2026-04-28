import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findJunk() {
    console.log('--- JUNK DATA DISCOVERY ---');
    try {
        // 1. Get valid station IDs
        const { data: stations } = await supabase.from('stations').select('id');
        const validIds = new Set(stations?.map(s => s.id) || []);
        console.log(`Reference: ${validIds.size} valid stations.`);

        // 2. Sample observations to see what's in there
        // Since we can't do "NOT IN" easily on millions of rows via client, 
        // let's try to find if there are station_ids that look "wrong" (length, format)

        const { data: samples } = await supabase.from('observations_6mn').select('station_id').limit(1000);
        const junkSamples = samples?.filter(s => !validIds.has(s.station_id)) || [];

        console.log(`In a sample of 1000 rows, ${junkSamples.length} IDs are not in the station list.`);
        if (junkSamples.length > 0) {
            console.log('Sample of junk IDs:', [...new Set(junkSamples.map(j => j.station_id))]);
        }

        // 3. Check for specific "trash" timestamps if the CSV import went wrong today
        const today = new Date().toISOString().split('T')[0];
        const { count: rowsToday } = await supabase.from('observations_6mn').select('*', { count: 'exact', head: true }).gte('timestamp', today);
        console.log(`Rows added today: ${rowsToday}`);

    } catch (e) {
        console.error('Failed:', e.message);
    }
}

findJunk();
