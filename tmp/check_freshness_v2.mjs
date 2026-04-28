import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('=== CHECK DATA FRESHNESS (REAL TABLES) ===\n');

  const tables = ['observations_horaire', 'observations_6mn', 'vigilance_status', 'vigilance_bulletins', 'api_secrets'];
  
  for (const table of tables) {
    console.log(`Checking ${table}...`);
    try {
      let query = supabase.from(table).select('*').limit(1);
      
      // Try to order by timestamp or created_at if possible
      if (table.includes('observation')) {
        query = query.order('timestamp', { ascending: false });
      } else if (table === 'api_secrets') {
        query = query.order('updated_at', { ascending: false });
      } else {
        query = query.order('id', { ascending: false }).limit(1).catch(() => supabase.from(table).select('*').limit(1));
      }

      const { data, error } = await query;
      
      if (error) {
        console.log(`  ❌ Error ${table}: ${error.code} - ${error.message}`);
        // Fallback simple select
        const { data: d2 } = await supabase.from(table).select('*').limit(1);
        if (d2 && d2.length > 0) console.log(`  ⚠️ Found data without order. Sample:`, JSON.stringify(d2[0]).substring(0, 100));
      } else if (data && data.length > 0) {
        const row = data[0];
        const ts = row.timestamp || row.last_update || row.updated_at || row.created_at;
        console.log(`  ✅ Last entry: ${ts || 'No timestamp found'}`);
        if (ts) {
            const ageHr = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60);
            console.log(`     Age: ${ageHr.toFixed(2)} hours`);
        }
      } else {
        console.log(`  ℹ️ Table ${table} is empty.`);
      }
    } catch (e) {
      console.log(`  💥 Exception ${table}: ${e.message}`);
    }
    console.log('');
  }

  // Check Storage
  console.log('--- STORAGE CHECK ---');
  const { data: files } = await supabase.storage.from('radar-mf').list('', { sortBy: { column: 'updated_at', order: 'desc' }, limit: 1 });
  if (files && files.length > 0) {
      console.log(`  ✅ Latest radar: ${files[0].name} (${files[0].updated_at})`);
      const ageHr = (Date.now() - new Date(files[0].updated_at).getTime()) / (1000 * 60 * 60);
      console.log(`     Age: ${ageHr.toFixed(2)} hours`);
  } else {
      console.log('  ❌ No radar files found.');
  }
}

run();
