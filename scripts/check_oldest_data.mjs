
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEarliestData() {
    console.log("Checking oldest records in database...");

    try {
        const { data: data6, error: err6 } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: true })
            .limit(1);

        if (err6) throw err6;
        console.log("Earliest record in observations_6mn:", data6[0]?.timestamp || "None");

        const { data: dataH, error: errH } = await supabase
            .from('observations_horaire')
            .select('timestamp')
            .order('timestamp', { ascending: true })
            .limit(1);

        if (errH) throw errH;
        console.log("Earliest record in observations_horaire:", dataH[0]?.timestamp || "None");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkEarliestData();
