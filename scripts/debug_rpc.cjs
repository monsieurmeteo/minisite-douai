const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                env[key] = val;
            }
        }
    });
    return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function testRpc() {
    console.log("🔍 Testing RPC 'get_suspicious_observations'...");

    const { data, error } = await supabase.rpc('get_suspicious_observations', { lookback_hours: 48 });

    if (error) {
        console.error("❌ RPC Error details:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("✅ RPC Success!");
        console.log(`Received ${data.length} items`);
        if (data.length > 0) {
            console.log("First item sample:", data[0]);
        }
    }
}

testRpc();
