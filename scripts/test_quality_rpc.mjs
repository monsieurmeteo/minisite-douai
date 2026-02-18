
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(
    urlMatch[1].trim(),
    keyMatch[1].trim()
);

async function testRpc() {
    console.log("Testing RPC get_suspicious_observations (12h)...");
    const { data, error } = await supabase.rpc('get_suspicious_observations', { lookback_hours: 12 });

    if (error) {
        console.error("❌ RPC Error:", error);
    } else {
        console.log("✅ RPC Success. Data length:", data ? data.length : 0);
        if (data && data.length > 0) {
            console.log("Sample:", data[0]);
        }
    }
}

testRpc();
