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

async function compareSchemas() {
    console.log("🔍 COMPARAISON DES SCHÉMAS");
    console.log("==========================\n");

    // Schema observations_horaire
    const { data: h } = await supabase
        .from('observations_horaire')
        .select('*')
        .limit(1);

    console.log("📊 observations_horaire :");
    if (h && h.length > 0) {
        Object.keys(h[0]).forEach(col => console.log(`   - ${col}`));
    } else {
        console.log("   (Aucune donnée pour voir le schéma)");
    }

    // Schema observations_6mn
    const { data: s } = await supabase
        .from('observations_6mn')
        .select('*')
        .limit(1);

    console.log("\n📊 observations_6mn :");
    if (s && s.length > 0) {
        Object.keys(s[0]).forEach(col => console.log(`   - ${col}`));
    }

    // Différences
    if (h && h.length > 0 && s && s.length > 0) {
        const hCols = Object.keys(h[0]);
        const sCols = Object.keys(s[0]);

        const onlyInH = hCols.filter(c => !sCols.includes(c));
        const onlyInS = sCols.filter(c => !hCols.includes(c));

        console.log("\n🔍 Colonnes UNIQUEMENT dans observations_horaire :");
        onlyInH.forEach(c => console.log(`   - ${c}`));

        console.log("\n🔍 Colonnes UNIQUEMENT dans observations_6mn :");
        onlyInS.forEach(c => console.log(`   - ${c}`));
    }
}

compareSchemas();
