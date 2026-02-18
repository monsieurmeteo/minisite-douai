
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase configuration in .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking observations_horaire table...");
    const { count, error } = await supabase
        .from('observations_horaire')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching count:", error);
    } else {
        console.log(`Total records in observations_horaire: ${count}`);
    }

    console.log("Checking latest data...");
    const { data: latest, error: latestError } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    if (latestError) {
        console.error("Error fetching latest data:", latestError);
    } else if (latest && latest.length > 0) {
        console.log(`Latest data timestamp: ${latest[0].timestamp}`);
    } else {
        console.log("No data found in observations_horaire.");
    }

    // Also check api_secrets to see if the token exists
    const { data: secrets, error: secretsError } = await supabase
        .from('api_secrets')
        .select('*');

    if (secretsError) {
        console.log("Could not read api_secrets (likely RLS):", secretsError.message);
    } else {
        console.log(`Found ${secrets.length} records in api_secrets.`);
    }
}

checkDatabase();
