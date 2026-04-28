import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function checkStorage() {
    console.log('--- Checking Supabase Storage Files ---');
    const { data, error } = await supabase
        .storage
        .from('vigilance-captures')
        .list('', {
            limit: 20,
            offset: 0,
            sortBy: { column: 'updated_at', order: 'desc' }
        });

    if (error) {
        console.error('Error listing storage:', error);
    } else {
        console.table(data.map(f => ({
            name: f.name,
            updated_at: f.updated_at,
            size: f.metadata?.size
        })));
    }
}

checkStorage();
