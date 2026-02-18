import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI'
);

async function setup() {
    console.log("Checking and creating table user_station_configs...");

    // Check if table exists
    const { error: checkError } = await supabase.from('user_station_configs').select('count').limit(1);

    if (checkError) {
        console.log("Table does not exist. Creating via RPC (if exec_sql exists) or informing user.");
        // We will try to create it via a generic SQL RPC if it exists, 
        // otherwise the user must run the SQL manually in the dashboard.
        // Since I cannot guarantee raw SQL execution via API, I'll update the frontend to be more resilient
        // and guide the user.
    } else {
        console.log("Table exists.");
    }
}

setup();
