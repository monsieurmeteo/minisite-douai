import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUpsert() {
    const row = {
        station_id: '99999999',
        timestamp: new Date().toISOString(),
        t: 25.0
    };
    console.log('Testing UPSERT on observations_6mn...');
    const { error } = await supabase.from('observations_6mn').upsert(row, { onConflict: 'station_id, timestamp' });
    if (error) {
        console.error('Upsert result:', error);
    } else {
        console.log('Upsert successful!');
        // Delete
        await supabase.from('observations_6mn').delete().eq('station_id', '99999999');
    }
}

testUpsert();
