import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('=== DATABASE SIZE AUDIT ===\n');

  // Query table sizes via RPC or a raw query if enabled.
  // Since we don't have direct SQL access, we estimate via count.
  const tables = [
    'observations_6mn', 
    'observations_horaire', 
    'vigilance_status', 
    'vigilance_bulletins',
    'radar_frames',
    'foudre'
  ];

  for (const table of tables) {
    console.log(`Auditing ${table}...`);
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  📊 Count: ${count} rows`);
      }
    } catch (e) {
      console.log(`  💥 Exception: ${e.message}`);
    }
  }

  // Check storage size
  console.log('\n--- STORAGE SIZE ---');
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    for (const b of buckets || []) {
        console.log(`  🪣 ${b.name}`);
        const { data: files } = await supabase.storage.from(b.name).list('', { limit: 1000 });
        console.log(`     Object count (root): ${files?.length || 0}`);
    }
  } catch(e) {}

  console.log('\n=== END AUDIT ===');
}

run();
