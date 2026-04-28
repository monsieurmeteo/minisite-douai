import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log(`Checking connection to: ${supabaseUrl}`);
  
  // Test 1: Check if 'observations' table exists and has data
  const { data, error, count } = await supabase
    .from('observations')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Error querying 'observations' table:", error.message);
  } else {
    console.log(`✅ 'observations' table is accessible. Total records: ${count}`);
  }

  // Test 2: Check 'secrets' table
  const { data: secrets, error: secretsError } = await supabase
    .from('secrets')
    .select('name')
    .limit(5);

  if (secretsError) {
    console.error("Error querying 'secrets' table:", secretsError.message);
  } else {
    console.log(`✅ 'secrets' table is accessible. Found ${secrets?.length} records.`);
  }
}

testConnection();
