
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadRecords() {
    console.log("Reading all_stations_records.json...");
    const data = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
    const ids = Object.keys(data);

    console.log(`Uploading ${ids.length} records to Supabase table 'station_climatology'...`);

    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const rows = batchIds.map(id => ({
            station_id: id,
            name: data[id].name,
            data: data[id]
        }));

        const { error } = await supabase.from('station_climatology').upsert(rows);
        if (error) {
            console.error(`Error in batch ${i}:`, error.message);
        } else {
            process.stdout.write(`\rProgress: ${i + rows.length}/${ids.length}`);
        }
    }
    console.log("\n✅ All records uploaded to Supabase.");
}

uploadRecords();
