import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function cleanBadStations() {
    console.log("Fetching exact count of valid stations...");
    // Let's get distinct station_ids that are valid (8 chars)
    // Wait, the easiest way is to delete anything that doesn't exist in the 'stations' table!
    // But REST API delete with join is not supported natively in a simple call, 
    // we can just delete from daily_summaries where station_id is not like '________'.

    // Wait, we can't do regular expressions easily in postgrest, but we can do length > 8 or length < 8!
    // Supabase has NO built in length filter.

    // BUT we can use wildcards!
    // Delete where station_id NOT LIKE '________' (8 underscores)

    console.log("Deleting rows with invalid station_id (not 8 chars)...");

    // Test what we'd delete first:
    const { data: badSamples, error: e1 } = await s.from('daily_summaries')
        .select('station_id, date')
        .not('station_id', 'like', '________')
        .limit(10);

    if (e1) console.error("Error fetching invalid samples:", e1);
    else console.log("Invalid samples:", badSamples);

    if (badSamples && badSamples.length > 0) {
        // Execute delete
        console.log("Proceeding with delete...");

        // delete daily_summaries
        const { error: dsDelErr, count: dsDelCount } = await s.from('daily_summaries')
            .delete({ count: 'exact' })
            .not('station_id', 'like', '________');

        console.log(`Deleted ${dsDelCount} invalid daily_summaries rows. ERR:`, dsDelErr);

        // delete observations_6mn
        const { error: obsDelErr, count: obsDelCount } = await s.from('observations_6mn')
            .delete({ count: 'exact' })
            .not('station_id', 'like', '________');

        console.log(`Deleted ${obsDelCount} invalid observations_6mn rows. ERR:`, obsDelErr);
    }
}

cleanBadStations();
