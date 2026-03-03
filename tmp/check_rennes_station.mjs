import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRennes() {
    const stationId = '35281001';
    console.log(`Checking presence of station ${stationId} in 'stations' table...`);
    const { data, error } = await supabase.from('stations').select('id, name').eq('id', stationId).single();
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`✅ Found: ${data.name} (${data.id})`);
    }
}

checkRennes();
