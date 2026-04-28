import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        const { data, error } = await supabase
            .from('daily_summaries')
            .select('date')
            .order('date', { ascending: false })
            .limit(30000);

        if (error) {
            console.error('Error:', error.message);
            return;
        }

        const counts = {};
        data.forEach(d => {
            counts[d.date] = (counts[d.date] || 0) + 1;
        });

        const sortedDates = Object.keys(counts).sort().reverse();
        console.log('Daily Summaries Coverage:');
        sortedDates.forEach(date => {
            console.log(`${date}: ${counts[date]} stations`);
        });

    } catch (e) {
        console.error(e);
    }
}

check();
