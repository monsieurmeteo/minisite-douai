import pg from 'pg';
const { Client } = pg;

async function smartPurge() {
    console.log('🚮 DÉBUT DU NETTOYAGE CHIRURGICAL PAR SCRIPT...');

    const client = new Client({
        connectionString: 'postgresql://postgres:Meteoclimatpro@db.ubdevaemtwbzxksjlhjg.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connecté.');

        let finished = false;
        let total = 0;

        while (!finished) {
            // Suppression par paquets de 25 000 (très petit pour être sûr)
            const query = `
                DELETE FROM observations_6mn
                WHERE ctid IN (
                    SELECT ctid FROM observations_6mn
                    WHERE station_id NOT IN (SELECT id FROM stations)
                    LIMIT 25000
                );
            `;

            const res = await client.query(query);
            const count = res.rowCount;
            total += count;

            if (count > 0) {
                console.log(`🗑️ Supprimé : ${count} lignes intruses (Total: ${total})...`);
                // Petite pause de 1s pour laisser le processeur respirer
                await new Promise(r => setTimeout(r, 1000));
            } else {
                console.log('✅ Plus aucune ligne intruse trouvée.');
                finished = true;
            }

            // Sécurité : on s'arrête si on dépasse un certain seuil de temps pour ce tour
            if (total > 5000000) {
                console.log('⏸️ Seuil de 5 millions atteint pour cette session. Pause.');
                break;
            }
        }

        console.log('✨ Nettoyage terminé pour cette phase.');

    } catch (e) {
        console.error('❌ ERREUR :', e.message);
    } finally {
        await client.end();
    }
}

smartPurge();
