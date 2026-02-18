import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chargement manuel de l'environnement
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Clés Supabase manquantes dans .env.local");
    process.exit(1);
}

const supabase = createClient(
    urlMatch[1].trim(),
    keyMatch[1].trim()
);

async function checkStatus() {
    console.log("📊 VÉRIFICATION ÉTAT BASE DE DONNÉES FOUDRE\n");
    console.log("=".repeat(60));

    try {
        // 1. Compter le total d'impacts (avec timeout court)
        console.log("\n🔍 Comptage des impacts...");
        const { count: totalCount, error: countError } = await supabase
            .from('lightning_strikes')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error("❌ Erreur comptage:", countError.message);
        } else {
            console.log(`✅ Total impacts en base : ${totalCount?.toLocaleString() || 'N/A'}`);
        }

        // 2. Récupérer les dates min/max
        console.log("\n📅 Période couverte...");
        const { data: minData } = await supabase
            .from('lightning_strikes')
            .select('strike_time')
            .order('strike_time', { ascending: true })
            .limit(1);

        const { data: maxData } = await supabase
            .from('lightning_strikes')
            .select('strike_time')
            .order('strike_time', { ascending: false })
            .limit(1);

        if (minData && minData[0]) {
            const minDate = new Date(minData[0].strike_time);
            console.log(`   📍 Plus ancien : ${minDate.toLocaleString('fr-FR')}`);
        }

        if (maxData && maxData[0]) {
            const maxDate = new Date(maxData[0].strike_time);
            console.log(`   📍 Plus récent : ${maxDate.toLocaleString('fr-FR')}`);
        }

        // 3. Vérifier les archives images
        console.log("\n🖼️  Archives images PNG...");
        const archiveDir = path.join(__dirname, '../public/archives-foudre');

        if (fs.existsSync(archiveDir)) {
            const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.png'));
            console.log(`   ✅ ${files.length} image(s) d'archive trouvée(s)`);

            if (files.length > 0) {
                console.log("\n   📋 Liste des archives :");
                files.sort().forEach(f => {
                    const stats = fs.statSync(path.join(archiveDir, f));
                    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                    console.log(`      - ${f} (${sizeMB} MB)`);
                });
            }
        } else {
            console.log("   ⚠️  Dossier archives-foudre n'existe pas encore");
        }

        // 4. Statistiques par jour (derniers 7 jours)
        console.log("\n📊 Statistiques des 7 derniers jours...");
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const startLocal = new Date(`${dateStr}T00:00:00`);
            const endLocal = new Date(`${dateStr}T23:59:59`);
            const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000)).toISOString();
            const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000)).toISOString();

            const { count, error } = await supabase
                .from('lightning_strikes')
                .select('*', { count: 'exact', head: true })
                .gte('strike_time', startUTC)
                .lte('strike_time', endUTC);

            if (!error) {
                const hasArchive = fs.existsSync(path.join(archiveDir, `bilan-foudre-${dateStr}.png`));
                const status = hasArchive ? '🖼️ ' : '📊';
                console.log(`   ${status} ${dateStr} : ${count?.toLocaleString() || 0} impacts ${hasArchive ? '(archivé)' : '(en base)'}`);
            }
        }

        // 5. Recommandations
        console.log("\n" + "=".repeat(60));
        console.log("💡 RECOMMANDATIONS :\n");

        if (totalCount && totalCount > 500000) {
            console.log("⚠️  Base volumineuse (>500k impacts)");
            console.log("   → Lancer l'archivage pour libérer de l'espace");
            console.log("   → Commande : node scripts/auto-archive.js");
        }

        const archiveFiles = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir).filter(f => f.endsWith('.png')).length : 0;
        if (archiveFiles === 0) {
            console.log("ℹ️  Aucune archive image créée");
            console.log("   → Lancer l'archivage manuel pour tester");
            console.log("   → Commande : node scripts/auto-archive.js");
        }

        if (archiveFiles > 0 && archiveFiles < 365) {
            console.log(`✅ ${archiveFiles} archive(s) créée(s)`);
            console.log("   → Système d'archivage opérationnel");
            console.log("   → Configurer le cron pour automatiser (voir ARCHIVAGE-README.md)");
        }

        console.log("\n" + "=".repeat(60));

    } catch (e) {
        console.error("❌ Erreur:", e.message);
    }
}

checkStatus();
