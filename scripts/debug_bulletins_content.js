import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function inspectBulletins() {
    console.log("🔍 Inspecting vigilance_bulletins...");

    // Get distinct domain_ids
    const { data: bulletins, error } = await supabase
        .from('vigilance_bulletins')
        .select('domain_id, title')
        .limit(50); // Just a sample

    if (error) {
        console.error("Error fetching bulletins:", error);
        return;
    }

    console.log(`Found ${bulletins.length} bulletins. Sample:`);
    bulletins.forEach(b => console.log(`- Domain: "${b.domain_id}" | Title: "${b.title}"`));

    // Check specifically for dept like '59' or '62'
    const { data: deptFiftyNine } = await supabase
        .from('vigilance_bulletins')
        .select('*')
        .eq('domain_id', '59');

    console.log(`Number of bulletins for '59': ${deptFiftyNine?.length || 0}`);
}

inspectBulletins();
