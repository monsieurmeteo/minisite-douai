import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('observations_horaire').select('timestamp').order('timestamp', { ascending: false }).limit(40000);
    const counts = {};
    if (data) {
        data.forEach(d => {
            const date = d.timestamp.split('T')[0];
            counts[date] = (counts[date] || 0) + 1;
        });
        const sorted = Object.keys(counts).sort().reverse();
        sorted.forEach(d => console.log(`${d}: ${counts[d]} obs`));
    }
}
check();
