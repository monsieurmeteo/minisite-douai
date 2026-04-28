import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('=== CHECK DATA FRESHNESS ===\n');

  const tables = ['observations', 'vigilance_status', 'vigilance_bulletins', 'radar_frames'];
  
  for (const table of tables) {
    console.log(`Checking ${table}...`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: false })
        .limit(1);
      
      if (error) {
        console.log(`  ❌ Error ${table}: ${error.code} - ${error.message}`);
        // Try without ID
        const { data: data2, error: error2 } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        if (error2) console.log(`  ❌ Second error ${table}: ${error2.message}`);
        else if (data2 && data2.length > 0) console.log(`  ⚠️ Table has data but no 'id' order possible. Sample:`, JSON.stringify(data2[0]).substring(0, 100));
        else console.log(`  ℹ️ Table ${table} is empty.`);
      } else if (data && data.length > 0) {
        console.log(`  ✅ Data found! Last entry:`, JSON.stringify(data[0]).substring(0, 200));
        // Look for timestamp
        const row = data[0];
        const ts = row.created_at || row.updated_at || row.last_update || row.horodatage || row.timestamp;
        console.log(`  🕒 Last timestamp: ${ts}`);
      } else {
        console.log(`  ℹ️ Table ${table} is empty.`);
      }
    } catch (e) {
      console.log(`  💥 Exception ${table}: ${e.message}`);
    }
    console.log('');
  }

  console.log('--- STORAGE CHECK ---');
  try {
    const { data: files, error } = await supabase.storage
      .from('radar-mf')
      .list('', { limit: 5, sortBy: { column: 'updated_at', order: 'desc' } });
    
    if (error) {
      console.log(`  ❌ Storage Error: ${error.message}`);
    } else {
      console.log(`  ✅ radar-mf files (last 5):`);
      files.forEach(f => console.log(`    - ${f.name} (${f.updated_at})`));
    }
  } catch (e) {
    console.log(`  💥 Storage Exception: ${e.message}`);
  }

  console.log('\n=== API SECRETS CHECK ===');
  try {
    const { data, error } = await supabase.from('api_secrets').select('*');
    if (error) console.log(`  ❌ Error: ${error.message}`);
    else {
      data.forEach(s => console.log(`  - ${s.provider}: updated_at=${s.updated_at}`));
    }
  } catch(e) {}

}

run();
