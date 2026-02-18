import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP'
);

async function checkFoudre() {
    console.log("Checking lightning_strikes table...");
    const { data, count, error } = await supabase
        .from('lightning_strikes')
        .select('*', { count: 'exact' })
        .limit(10)
        .order('strike_time', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Total records in DB: ${count}`);
    if (data && data.length > 0) {
        console.log("Latest records in DB:");
        data.forEach(s => {
            console.log(`- Time: ${s.strike_time} | Lat: ${s.lat} | Lon: ${s.lon}`);
        });
    } else {
        console.log("No records found.");
    }

    // Check specifically for today 12:00
    const startTs = '2026-01-24T12:00:00';
    const endTs = '2026-01-24T12:59:59';
    const { data: data12, error: error12 } = await supabase
        .from('lightning_strikes')
        .select('*')
        .gte('strike_time', startTs)
        .lte('strike_time', endTs);

    console.log(`\nRecords between 12:00 and 13:00 today: ${data12 ? data12.length : 0}`);
}

checkFoudre();
