import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
    const row = {
        station_id: '99999999', // Dummy station
        timestamp: new Date().toISOString(),
        t: 20.5
    };
    console.log('Attempting insert...');
    const { error } = await supabase.from('observations_6mn').insert([row]);
    if (error) {
        console.error('Insert error:', error);
    } else {
        console.log('Insert success!');
        // Delete it
        await supabase.from('observations_6mn').delete().eq('station_id', '99999999');
    }
}

testInsert();
