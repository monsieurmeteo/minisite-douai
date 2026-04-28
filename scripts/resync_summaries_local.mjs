import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function localSync() {
    console.log("🔄 Synchronisation JS locale (sans faire planter la base)...");
    
    // Pour aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const startTs = `${today}T00:00:00Z`;
    const endTs = `${today}T23:59:59Z`;

    console.log(`📡 Téléchargement des observations de la journée (${today})...`);
    
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
            console.error("❌ Erreur de téléchargement :", error);
            return;
        }
        
        if (data && data.length > 0) {
            allRows.push(...data);
            if (data.length < BATCH) hasMore = false;
            else from += BATCH;
            console.log(`... ${allRows.length} lignes téléchargées`);
        } else {
            hasMore = false;
        }
    }
    
    if (allRows.length === 0) {
        console.log("Aucune donnée aujourd'hui.");
        return;
    }
    
    console.log("🧮 Calcul des résumés en cours...");
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

    console.log(`🚀 Envoi de ${upserts.length} résumés vers Supabase...`);
    const { error: upsertError } = await supabase
        .from('daily_summaries')
        .upsert(upserts, { onConflict: 'station_id, date' });
        
    if (upsertError) {
        console.error("❌ Erreur d'envoi :", upsertError);
    } else {
        console.log("✅ TERMINÉ ! Vos cartes vont s'afficher.");
    }
}

localSync();
