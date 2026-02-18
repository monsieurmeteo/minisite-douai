import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Charger les variables d'environnement
const envContent = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function extractFromDatabase() {
    console.log('🔍 Extraction des noms depuis la base de données... (SCAN COMPLET)');

    try {
        const uniqueStations = new Set();
        let from = 0;
        const batchSize = 10000;
        let more = true;

        // Récupérer TOUS les IDs uniques
        console.log('📡 Scan de la base de données...');
        while (more) {
            const { data, error } = await supabase
                .from('observations_6mn')
                .select('station_id')
                .range(from, from + batchSize - 1);

            if (error) {
                console.error('Erreur:', error);
                break;
            }

            if (data.length === 0) {
                more = false;
            } else {
                data.forEach(d => uniqueStations.add(d.station_id));
                from += batchSize;
                console.log(`... Scanné ${from} lignes, trouvé ${uniqueStations.size} stations uniques`);
            }
        }

        console.log(`✅ TOTAL: ${uniqueStations.size} stations uniques à nommer`);

        // Charger l'existant pour gagner du temps
        let existingNames = {};
        if (fs.existsSync('src/data/stationNames.json')) {
            try {
                existingNames = JSON.parse(fs.readFileSync('src/data/stationNames.json', 'utf8'));
            } catch (e) {
                console.log('Fichier existant corrompu, on repart de zéro');
            }
        }

        const stationNames = { ...existingNames };
        const stationArray = Array.from(uniqueStations);
        let processed = 0;
        let updated = 0;

        for (const stationId of stationArray) {
            processed++;

            // Si on a déjà un nom valide (qui n'est pas juste "Station X"), on passe
            // MAIS l'utilisateur veut "Nom + Numéro", donc on vérifie le format
            const currentName = stationNames[stationId];
            if (currentName && !currentName.startsWith('Station ') && currentName.includes('(')) {
                // Déjà au bon format (ex: "Douai (59178001)")
                continue;
            }

            const codeCommune = stationId.substring(0, 5);

            try {
                // Appel API Géo
                const res = await fetch(`https://geo.api.gouv.fr/communes/${codeCommune}?fields=nom`);
                if (res.ok) {
                    const commune = await res.json();
                    // FORMAT DEMANDÉ : Nom (Numéro)
                    stationNames[stationId] = `${commune.nom} (${stationId})`;
                    updated++;
                } else {
                    // Si échec API, on garde juste le numéro
                    stationNames[stationId] = `Station ${stationId}`;
                }
            } catch (e) {
                stationNames[stationId] = `Station ${stationId}`;
            }

            if (updated > 0 && updated % 50 === 0) {
                console.log(`📍 Mis à jour ${updated} noms... (${processed}/${uniqueStations.size})`);
                // Sauvegarde intermédiaire
                fs.writeFileSync('src/data/stationNames.json', JSON.stringify(stationNames, null, 2));
            }

            // Petit délai pour l'API
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Sauvegarde finale
        fs.writeFileSync(
            'src/data/stationNames.json',
            JSON.stringify(stationNames, null, 2)
        );

        console.log('✅ Fichier complet mis à jour !');
        console.log(`📊 Total Stations: ${Object.keys(stationNames).length}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

extractFromDatabase();
