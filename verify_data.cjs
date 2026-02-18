
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually to avoid dotenv dependency issues
function loadEnv() {
    try {
        const content = fs.readFileSync(path.resolve('.env.local'), 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                env[key] = val;
            }
        });
        return env;
    } catch (e) {
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Impossible de lire .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiag() {
    console.log("🔍 DIAGNOSTIC BASE DE DONNÉES");
    console.log("---------------------------");

    // Check Lille (59343001) which is a major station
    const stationsToCheck = ['59343001', '59178001']; // Lille, Douai

    for (const id of stationsToCheck) {
        const { data, error } = await supabase
            .from('observations_horaire')
            .select('*')
            .eq('station_id', id)
            .order('timestamp', { ascending: false })
            .limit(3);

        if (error) {
            console.error(`❌ Erreur pour ${id}:`, error.message);
            continue;
        }

        console.log(`\n📍 Station ${id}:`);
        if (data.length === 0) {
            console.log("   ⚠️ Aucune donnée trouvée.");
        } else {
            data.forEach(d => {
                console.log(`   📅 ${d.timestamp} | T: ${d.t}°C | Pluie: ${d.rr1}mm | Ins: ${d.insolh}`);
            });

            // Calc retard
            const last = new Date(data[0].timestamp);
            const now = new Date();
            const hours = (now - last) / (1000 * 60 * 60);
            console.log(`   ⏱️ Retard: ${hours.toFixed(1)} heures`);
        }
    }
}

runDiag();
