import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🤖 ROBOT DE SECOURS ACTIVÉ !');
console.log('============================');
console.log('Ce robot surveille votre base de données.');
console.log('Si les données sont obsolètes, il lance une mise à jour.\n');

async function checkAndRun() {
    try {
        const { data: latest6mn } = await supabase
            .from('observations_6mn')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);

        const lastTS = latest6mn?.[0]?.timestamp;
        const now = new Date();

        let shouldRun = false;
        let diffMinutes = 999;

        if (!lastTS) {
            console.log('❌ Aucune donnée en base ! Lancement immédiat...');
            shouldRun = true;
        } else {
            const lastDate = new Date(lastTS);
            diffMinutes = Math.floor((now - lastDate) / 60000);

            // UTC+1 display
            const lastDateFR = new Date(lastDate.getTime() + 60 * 60 * 1000).toISOString().split('T')[1].split('.')[0];
            const nowFR = new Date(now.getTime() + 60 * 60 * 1000).toISOString().split('T')[1].split('.')[0];

            process.stdout.write(`\r[${nowFR}] Dernier relevé: ${lastDateFR} (il y a ${diffMinutes} min) `);

            // Si plus de 15 minutes de retard (pour laisser le temps au cycle d'arriver)
            if (diffMinutes > 45) { // Météo-france a ~30-40 min de délai naturel
                console.log('\n⚠️  Données trop vieilles (> 45 min). Lancement de la collecte...');
                shouldRun = true;
            }
        }

        if (shouldRun) {
            console.log('🚀 Démarrage de la mise à jour...');
            try {
                // Run update_complete.mjs
                await execPromise('node update_complete.mjs');
                console.log('✅ Mise à jour terminée avec succès.');
            } catch (error) {
                console.error('❌ Erreur lors de la mise à jour:', error.message);
                // Try repairing token just in case
                console.log('🔄 Tentative de réparation du token...');
                await execPromise('node repair_token.mjs');
            }
        }

    } catch (error) {
        console.error('\n❌ Erreur de surveillance:', error.message);
    }
}

// Premier check immédiat
checkAndRun();

// Puis toutes les 5 minutes
setInterval(checkAndRun, 5 * 60 * 1000);
