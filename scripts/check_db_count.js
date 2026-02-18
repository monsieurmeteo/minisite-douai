
import fs from 'fs';
import path from 'path';

// Config
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const URL = urlMatch[1].trim();
const KEY = keyMatch[1].trim();

async function count() {
    console.log("📊 Comptage des données archivées...");
    try {
        // On demande le nombre total de lignes (avec exact count) pour observations_horaire
        const res = await fetch(`${URL}/rest/v1/observations_horaire?select=*&limit=1`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`,
                'Prefer': 'count=exact'
            }
        });

        // On demande aussi pour la table 'observations' (ancienne table ?)
        const res2 = await fetch(`${URL}/rest/v1/observations?select=*&limit=1`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`,
                'Prefer': 'count=exact'
            }
        });


        // On demande aussi pour la table 'observations_6mn'
        const res3 = await fetch(`${URL}/rest/v1/observations_6mn?select=*&limit=1`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`,
                'Prefer': 'count=exact'
            }
        });

        const range = res.headers.get('content-range'); // ex: "0-0/5"ou "0-0/2500"
        const range2 = res2.headers.get('content-range');
        const range3 = res3.headers.get('content-range');

        if (range) {
            const total = range.split('/')[1];
            console.log(`\nCompteur (observations_horaire) : ${total} relevés.`);
        }

        if (range3) {
            const total3 = range3.split('/')[1];
            console.log(`Compteur (observations_6mn) : ${total3} relevés.`);
        }

        if (range2) {
            const total2 = range2.split('/')[1];
            if (total2 && total2 !== '*') console.log(`Compteur (observations) : ${total2} relevés.`);
        }

        console.log("\n--- Bilan ---");
        const t1 = range ? parseInt(range.split('/')[1]) : 0;
        const t3 = range3 ? parseInt(range3.split('/')[1]) : 0;

        if (t1 > 0 || t3 > 0) {
            console.log(`✅ DONNÉES PRÉSENTES ! Total : ${t1 + t3}`);
            if (t3 > 0) console.log("🚀 L'archivage 6 minutes (Site Web) fonctionne !");
            else console.log("⚠️ Pas encore de données 6 minutes. Rechargez la page web.");
        } else {
            console.log("⚠️ Aucune donnée trouvée.");
        }
    } catch (e) {
        console.error(e);
    }
}

count();
