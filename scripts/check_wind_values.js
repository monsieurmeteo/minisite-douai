import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkWind() {
    console.log("🔍 Checking wind values (ff and fxi)...");
    const { data, error } = await supabase
        .from('observations_6mn')
        .select('station_id, ff, fxi, timestamp')
        .not('ff', 'is', null)
        .limit(10);

    if (error) {
        console.error("❌ Error:", error.message);
    } else {
        console.table(data);
        if (data.length > 0) {
            console.log("\nValue comparison:");
            data.forEach(d => {
                console.log(`Station ${d.station_id}: ff=${d.ff}, fxi=${d.fxi} | If m/s, converted: ${Math.round(d.ff * 3.6)} km/h`);
            });
        }
    }
}

checkWind();
