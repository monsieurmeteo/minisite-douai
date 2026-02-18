
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) { console.error("❌ Pas de clés Supabase."); process.exit(1); }

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function doctor() {
    console.log("🩺 DIAGNOSTIC SUPABASE COMPLET 🩺\n");

    // 1. Vérification des tables de Données
    const tables = ['observations', 'observations_horaire', 'observations_6mn'];

    for (const t of tables) {
        process.stdout.write(`Vérification table '${t}'... `);
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`❌ Erreur ou Inexistante (${error.code})`);
        } else {
            console.log(`✅ EXISTE (${count} lignes)`);

            // Dates min/max si des données existent
            if (count > 0) {
                // Try 'timestamp' first
                let col = 'timestamp';
                let { data: min, error } = await supabase.from(t).select(col).order(col, { ascending: true }).limit(1);

                // If error (probably column not found), try 'date_obs'
                if (error) {
                    col = 'date_obs';
                    const res = await supabase.from(t).select(col).order(col, { ascending: true }).limit(1);
                    min = res.data;
                }

                const { data: max } = await supabase.from(t).select(col).order(col, { ascending: false }).limit(1);

                const dMin = min && min[0] ? min[0][col] : '?';
                const dMax = max && max[0] ? max[0][col] : '?';

                console.log(`   📅 De ${dMin} à ${dMax}`);
            }
        }
    }

    console.log("\n2. Vérification des Secrets (Tokens API)");

    // Check table 'secrets' (Setup Guide)
    const { data: s1, error: e1 } = await supabase.from('secrets').select('*');
    if (!e1 && s1) {
        console.log(`✅ Table 'secrets' trouvée (${s1.length} entrées).`);
        s1.forEach(r => console.log(`   - ${r.name}: ${r.value ? '*******' : '(vide)'}`));
    } else {
        console.log("❌ Table 'secrets' non trouvée.");
    }

    // Check table 'api_secrets' (Robot Code)
    const { data: s2, error: e2 } = await supabase.from('api_secrets').select('*');
    if (!e2 && s2) {
        console.log(`✅ Table 'api_secrets' trouvée (${s2.length} entrées).`);
        s2.forEach(r => console.log(`   - ${r.provider}: ${r.access_token ? '*******' : '(vide)'}`));
    } else {
        console.log("❌ Table 'api_secrets' NON TROUVÉE (C'est peut-être le problème !)");
    }

}

doctor();
