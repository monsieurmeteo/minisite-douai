import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function analyzeHoraire() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('🔍 ANALYSE COMPLÈTE DES DONNÉES HORAIRES\n');

    // Check different timestamps
    const timestamps = [
        '2026-01-19T14:00:00+00:00', // 15h française
        '2026-01-19T13:00:00+00:00', // 14h française  
        '2026-01-19T12:00:00+00:00', // 13h française
        '2026-01-19T11:00:00+00:00', // 12h française
    ];

    for (const ts of timestamps) {
        const { count } = await supabase
            .from('observations_horaire')
            .select('*', { count: 'exact', head: true })
            .eq('timestamp', ts);

        const date = new Date(ts);
        const frenchHour = date.getHours() + 1; // UTC+1
        console.log(`${ts} (${frenchHour}h française): ${count || 0} stations`);
    }

    // Get unique timestamps
    const { data: uniqueTimestamps } = await supabase
        .from('observations_horaire')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(100);

    const unique = [...new Set(uniqueTimestamps?.map(r => r.timestamp))];
    console.log(`\n📊 Derniers timestamps uniques (${unique.length}):`);
    unique.slice(0, 10).forEach(ts => {
        const date = new Date(ts);
        const frenchHour = date.getHours() + 1;
        console.log(`   ${ts} (${frenchHour}h française)`);
    });
}

analyzeHoraire();
