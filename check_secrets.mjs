
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const supabaseKey = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

async function checkSecrets() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Checking api_secrets table...");
    try {
        const { data, error } = await supabase
            .from('api_secrets')
            .select('*');

        if (error) {
            console.error("Error fetching secrets:", error.message);
        } else {
            console.log(`Found ${data.length} secrets.`);
            data.forEach(s => {
                console.log(`- Provider: ${s.provider}, Updated at: ${s.updated_at}`);
                if (s.provider === 'meteo_france') {
                    console.log(`  Token starts with: ${s.access_token?.substring(0, 10)}...`);
                }
            });
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

checkSecrets();
