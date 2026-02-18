const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });
        return env;
    } catch { return {}; }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function getSchema() {
    console.log("🔍 SCHÉMA DE LA TABLE observations_6mn");
    console.log("======================================\n");

    const { data } = await supabase
        .from('observations_6mn')
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        console.log("Colonnes disponibles :");
        Object.keys(data[0]).forEach(col => {
            console.log(`   - ${col}: ${typeof data[0][col]} (${data[0][col]})`);
        });
    } else {
        console.log("Aucune donnée trouvée");
    }
}

getSchema();
