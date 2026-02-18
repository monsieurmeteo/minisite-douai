const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking station coverage...");

    // 1. Count metadata
    const { count, error: err1 } = await supabase.from('stations').select('*', { count: 'exact', head: true });
    if (err1) console.error("Error fetching stations count:", err1);
    console.log('Stations in Metadata Table:', count);

    // 2. Count observations
    // We try to get yesterday's data to be sure
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log("Fetching observations for:", dateStr);
    const { data, error: err2 } = await supabase.rpc('get_daily_extremes_full', { target_date: dateStr });

    if (err2) {
        console.error("Error fetching observations:", err2);
        return;
    }

    console.log('Stations with observation data:', data.length);

    // 3. Find intersection
    const { data: metaData } = await supabase.from('stations').select('id');
    const metaIds = new Set(metaData.map(x => x.id));

    const missing = data.filter(d => !metaIds.has(d.station_id));
    console.log('Stations MISSING from Metadata:', missing.length);

    if (missing.length > 0) {
        console.log("Sample missing IDs:", missing.slice(0, 5).map(x => x.station_id));
        console.log("The user is right! We are filtering out data because we lack metadata.");
    } else {
        console.log("No missing metadata. The problem might be filtering logic in the frontend.");
    }
}

check();
