import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkDept29() {
    const { data, error } = await supabase
        .from('vigilance_status')
        .select('*')
        .eq('dep_code', '29');

    if (error) {
        console.error("Error:", error);
    } else {
        data.forEach(d => {
            console.log(`Period: ${d.period} (${d.start_time} to ${d.end_time})`);
            console.log(`Global Level: ${d.level}`);
            d.risks.forEach(r => {
                if (r.level > 1) {
                    console.log(`  - Risk ID ${r.id}: Level ${r.level}`);
                }
            });
            console.log("---");
        });
    }
}

checkDept29();
