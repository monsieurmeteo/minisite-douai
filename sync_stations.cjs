/**
 * Script de synchronisation des métadonnées stations
 * Récupère les coordonnées GPS pour toutes les stations manquantes
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function syncStations() {
    console.log('📊 Récupération des observations...');

    // 1. Récupérer toutes les stations avec des observations
    const allObs = [];
    for (let i = 0; i < 5; i++) {
        const { data } = await supabase
            .rpc('get_daily_extremes', { target_date: new Date().toISOString().split('T')[0] })
            .range(i * 1000, (i + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        allObs.push(...data);
    }
    console.log(`   Total observations: ${allObs.length}`);

    // 2. Récupérer les stations déjà connues
    const { data: existingStations } = await supabase.from('stations').select('id');
    const existingIds = new Set(existingStations.map(s => s.id));
    console.log(`   Stations avec metadata: ${existingIds.size}`);

    // 3. Identifier les manquantes
    const missingIds = [...new Set(allObs.map(o => o.station_id).filter(id => !existingIds.has(id)))];
    console.log(`   Stations MANQUANTES: ${missingIds.length}`);

    if (missingIds.length === 0) {
        console.log('✅ Toutes les stations ont leurs coordonnées !');
        return;
    }

    // 4. Récupérer les coordonnées via l'API Geo
    console.log('🌍 Récupération des coordonnées GPS...');
    const toInsert = [];
    let processed = 0;

    for (const id of missingIds) {
        const insee = id.substring(0, 5);
        try {
            const response = await fetch(`https://geo.api.gouv.fr/communes/${insee}?fields=nom,centre`);
            if (response.ok) {
                const data = await response.json();
                if (data.centre && data.centre.coordinates) {
                    toInsert.push({
                        id: id,
                        name: data.nom || `Station ${id}`,
                        lat: data.centre.coordinates[1],
                        lon: data.centre.coordinates[0]
                    });
                }
            }
        } catch (e) {
            // Ignorer les erreurs individuelles
        }

        processed++;
        if (processed % 100 === 0) {
            console.log(`   Traité: ${processed}/${missingIds.length}`);
        }

        // Petit délai pour ne pas surcharger l'API
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`📥 ${toInsert.length} stations à insérer...`);

    // 5. Insérer par lots
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('stations').upsert(batch, { onConflict: 'id' });
        if (!error) inserted += batch.length;
    }

    console.log(`✅ ${inserted} nouvelles stations insérées !`);

    // 6. Vérification finale
    const { count } = await supabase.from('stations').select('*', { count: 'exact', head: true });
    console.log(`📊 Total stations avec coordonnées: ${count}`);
}

syncStations().catch(console.error);
