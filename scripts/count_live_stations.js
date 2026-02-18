import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function countLiveStations() {
    console.log("🔍 Checking real station count in last 2 hours...");

    // Count distinct station_ids in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error, count } = await supabase
        .from('observations_6mn')
        .select('station_id', { count: 'exact', head: false })
        .gt('timestamp', twoHoursAgo)
        .limit(20000);

    if (error) {
        console.error("❌ Error:", error.message);
    } else {
        const distinctStations = new Set(data.map(d => d.station_id));
        console.log(`Total rows in last 2h: ${data.length}`);
        console.log(`Unique stations in last 2h: ${distinctStations.size}`);
    }
}

countLiveStations();
