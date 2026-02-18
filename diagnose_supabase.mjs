import fs from 'fs';

async function check() {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
        const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

        console.log(`Checking Supabase at ${url}...`);

        const response = await fetch(`${url}/rest/v1/observations_6mn?select=count`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Range': '0-0',
                'Prefer': 'count=exact'
            }
        });

        const count = response.headers.get('content-range');
        console.log(`Data count in observations_6mn: ${count}`);

        const latestResponse = await fetch(`${url}/rest/v1/observations_6mn?select=timestamp&order=timestamp.desc&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const latest = await latestResponse.json();
        if (latest && latest.length > 0) {
            console.log(`Latest record timestamp: ${latest[0].timestamp}`);
        } else {
            console.log("No records found.");
        }
    } catch (e) {
        console.error("Error checking Supabase:", e.message);
    }
}

check();
