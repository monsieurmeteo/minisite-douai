import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const supabaseKey = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR'; // service_role key from .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking Supabase data...');
    
    // Check 6mn observations
    const { data: obs, error: errObs, count } = await supabase
        .from('observations_6mn')
        .select('*', { count: 'exact', head: false })
        .order('timestamp', { ascending: false })
        .limit(5);
        
    if (errObs) {
        console.error('❌ Error fetching observations:', errObs);
    } else {
        console.log(`✅ Found ${count} total records in observations_6mn.`);
        console.log('Latest 5 records:');
        obs.forEach(o => console.log(` - Station: ${o.station_id}, Time: ${o.timestamp}, Temp: ${o.t}`));
    }
    
    // Check daily summaries
    const { data: sum, error: errSum } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);
        
    if (errSum) {
        console.error('❌ Error fetching summaries:', errSum);
    } else {
        console.log('✅ Latest 5 summaries:');
        sum.forEach(s => console.log(` - Station: ${s.station_id}, Date: ${s.date}, Max: ${s.t_max}`));
    }
}

checkData();
