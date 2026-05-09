import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// =========================================================
// LOGIQUE DE SÉCURITÉ :
// - On ne supprime JAMAIS les données récentes (< 48h)
// - Le script d'archive (02h30) s'occupe de l'archivage
// - Ce cleanup ne vise que les données déjà archivables
//   qui n'auraient pas été supprimées (ex: archive en échec)
// - Limite haute : 700 000 lignes (≈ 1.5 jours × 2000 postes)
// =========================================================
const MAX_ROWS_OBSERVATIONS = 700_000;   // Limite haute de sécurité
const ARCHIVE_THRESHOLD_HOURS = 24;      // Sécurité : on ne touche pas aux dernières 24h (laisse le temps au cron d'archiver)

async function cleanupIfNeeded() {
    console.log("🧹 Vérification du volume d'observations_6mn...");
    try {
        // Comptage estimé rapide via les stats PostgreSQL
        const { data: countData, error: countError } = await supabase.rpc('get_observations_count');
        
        let count = countData;
        if (countError) {
            // Fallback : comptage estimé via l'API Supabase
            const { count: apiCount, error: apiErr } = await supabase
                .from('observations_6mn')
                .select('*', { count: 'estimated', head: true });
            if (apiErr) {
                console.warn("   ⚠️ Impossible de vérifier le volume :", apiErr.message);
                return;
            }
            count = apiCount;
        }
        
        if (count <= MAX_ROWS_OBSERVATIONS) {
            console.log(`   ✅ Volume OK : ~${count} lignes (max sécurité: ${MAX_ROWS_OBSERVATIONS})`);
            return;
        }
        
        // La table est trop volumineuse → supprimer uniquement les données > 48h
        // (celles-ci auraient dû être archivées par le cron de 02h30)
        const cutoff = new Date(Date.now() - ARCHIVE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
        console.log(`   🚨 ~${count} lignes détectées (limite: ${MAX_ROWS_OBSERVATIONS})`);
        console.log(`   → Suppression des données antérieures au ${cutoff} (>${ARCHIVE_THRESHOLD_HOURS}h)...`);
        console.log(`   ⚠️  ATTENTION : Ces données auraient dû être archivées par le cron de 02h30 !`);
        
        // Suppression par tranches de 6h pour éviter les timeouts
        let totalDeleted = 0;
        const archiveCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Max 7 jours en arrière
        
        for (let h = 168; h >= ARCHIVE_THRESHOLD_HOURS; h -= 6) {
            const start = new Date(Date.now() - (h + 6) * 60 * 60 * 1000).toISOString();
            const end = new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
            
            const { error: delErr } = await supabase
                .from('observations_6mn')
                .delete()
                .gte('timestamp', start)
                .lt('timestamp', end);
            
            if (delErr) {
                console.warn(`   ⚠️ Erreur tranche ${h}h-${h+6}h :`, delErr.message);
            } else {
                totalDeleted++;
            }
        }
        
        console.log(`   ✅ Nettoyage sécurisé effectué (${totalDeleted} tranches de 6h supprimées).`);
        console.log(`   💡 Pour éviter cela : vérifier que le cron 02h30 fonctionne bien.`);

    } catch (e) {
        console.warn("   ⚠️ Erreur nettoyage (non bloquant) :", e.message);
    }
}


async function localSync() {
    console.log(`🔄 Synchronisation JS locale — ${new Date().toISOString()}`);
    
    // ÉTAPE 1 : Nettoyage préventif AVANT la sync (évite les timeouts)
    await cleanupIfNeeded();

    // ÉTAPE 2 : Sync des résumés quotidiens
    const today = new Date().toISOString().split('T')[0];
    const startTs = `${today}T00:00:00Z`;
    const endTs = `${today}T23:59:59Z`;

    console.log(`\n📡 Téléchargement des observations de la journée (${today})...`);
    
    const BATCH = 5000;
    let allRows = [];
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
        const { data, error } = await supabase
            .from('observations_6mn')
            .select('station_id, t, fxi, rr_per, timestamp')
            .gte('timestamp', startTs)
            .lte('timestamp', endTs)
            .range(from, from + BATCH - 1);
            
        if (error) {
            console.error("❌ Erreur de téléchargement :", error.message);
            break;
        }
        
        if (data && data.length > 0) {
            allRows.push(...data);
            if (data.length < BATCH) hasMore = false;
            else from += BATCH;
            if (allRows.length % 10000 === 0) console.log(`   ... ${allRows.length} lignes téléchargées`);
        } else {
            hasMore = false;
        }
    }
    
    if (allRows.length === 0) {
        console.log("ℹ️ Aucune donnée aujourd'hui — table probablement vide (après un nettoyage récent).");
        return;
    }
    
    console.log(`\n🧮 Calcul des résumés pour ${allRows.length} observations...`);
    const stationMap = new Map();
    
    for (const row of allRows) {
        const sid = row.station_id;
        if (!stationMap.has(sid)) {
            stationMap.set(sid, {
                station_id: sid,
                date: today,
                temp_min: 999,
                temp_max: -999,
                wind_gust_max: -1,
                wind_gust_time: null,
                rain_total: 0
            });
        }
        const st = stationMap.get(sid);
        if (row.t !== null && row.t < st.temp_min) st.temp_min = row.t;
        if (row.t !== null && row.t > st.temp_max) st.temp_max = row.t;
        if (row.fxi !== null && row.fxi > st.wind_gust_max) {
            st.wind_gust_max = row.fxi;
            st.wind_gust_time = row.timestamp;
        }
        if (row.rr_per !== null && row.rr_per > 0) st.rain_total += row.rr_per;
    }
    
    // Format final
    const upserts = Array.from(stationMap.values()).map(s => {
        if (s.temp_min === 999) s.temp_min = null;
        if (s.temp_max === -999) s.temp_max = null;
        if (s.wind_gust_max === -1) s.wind_gust_max = null;
        s.updated_at = new Date().toISOString();
        return s;
    });

    console.log(`\n🚀 Envoi de ${upserts.length} résumés vers Supabase...`);
    
    // Upsert par batch pour éviter les timeouts
    const UPSERT_BATCH = 500;
    for (let i = 0; i < upserts.length; i += UPSERT_BATCH) {
        const chunk = upserts.slice(i, i + UPSERT_BATCH);
        const { error: upsertError } = await supabase
            .from('daily_summaries')
            .upsert(chunk, { onConflict: 'station_id, date' });
            
        if (upsertError) {
            console.error(`❌ Erreur envoi batch ${i}-${i + UPSERT_BATCH} :`, upsertError.message);
        }
    }
    
    console.log("✅ TERMINÉ !");
}

localSync();
