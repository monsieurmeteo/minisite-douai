import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkData() {
    console.log("Checking observations_6mn...");
    const { data: latest, error } = await supabase
        .from('observations_6mn')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching observations_6mn:", error.message);
    } else {
        console.log("Latest 5 records in observations_6mn:");
        latest.forEach(r => {
            console.log(`- Station: ${r.station_id}, Time: ${r.timestamp}, Temp: ${r.t}, Wind: ${r.ff}, Gusts: ${r.fxi}`);
        });
    }

    console.log("\nChecking User Configs...");
    const { data: configs, error: configError } = await supabase
        .from('user_station_configs')
        .select('*');

    if (configError) {
        console.error("Error fetching configs:", configError.message);
    } else {
        console.log(`Found ${configs.length} active configurations.`);
        configs.forEach(c => {
            console.log(`- City: ${c.city_name}, Station ID: ${c.nearest_station_id}, Topic: ${c.ntfy_topic}, Wind Alert: ${c.alert_wind_enabled} (${c.alert_wind_threshold})`);
        });
    }
}

checkData();
