import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function updateSmart() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Récupérer le Token
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) { console.error('❌ Token absent'); return; }

    console.log('⚡ MISE À JOUR INTELLIGENTE (SMART UPDATE)\n');

    // ============================================
    // 1. DONNÉES 6 MINUTES (Priorité Absolue)
    // ============================================
    const { data: last6mn } = await supabase
        .from('observations_6mn')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

    const lastTs = last6mn?.[0]?.timestamp ? new Date(last6mn[0].timestamp) : new Date(Date.now() - 3 * 60 * 60 * 1000); // Default 3h ago
    const now = new Date();

    // On génère les slots manquants (de Last + 6min jusqu'à Now - 10min pour marge API)
    const cyclesToFetch = [];
    let reader = new Date(lastTs.getTime() + 6 * 60000); // Start next slot
    const limitDate = new Date(now.getTime() - 12 * 60000); // Stop à T-12 min (Marge de sécurité API)

    while (reader <= limitDate) {
        // Round to nearest 6mn
        reader.setMinutes(Math.floor(reader.getMinutes() / 6) * 6, 0, 0);
        if (reader > lastTs) {
            cyclesToFetch.push(new Date(reader));
        }
        reader = new Date(reader.getTime() + 6 * 60000);

        // Sécurité : Max 10 cycles d'un coup pour pas timeout
        if (cyclesToFetch.length >= 15) break;
    }

    if (cyclesToFetch.length === 0) {
        console.log('✅ Base 6mn à jour (Aucun nouveau créneau disponible).');
    } else {
        console.log(`📥 Récupération de ${cyclesToFetch.length} cycles manquants...`);

        for (const dateObj of cyclesToFetch) {
            const dateStr = dateObj.toISOString().split('.')[0] + 'Z';
            process.stdout.write(`   📅 ${dateStr} ... `);

            try {
                const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${dateStr}&format=json`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

                if (res.status === 404 || res.status === 400 || res.status === 204) {
                    console.log('⚠️  Pas encore dispo');
                    continue; // Skip silently
                }
                if (!res.ok) {
                    console.log(`❌ HTTP ${res.status}`);
                    continue;
                }

                const data = await res.json();
                if (!Array.isArray(data)) { console.log('❌ Format invalide'); continue; }

                // Transformation
                const rows = data.map(obs => ({
                    station_id: obs.id || obs.id_station || obs.geo_id_insee,
                    timestamp: new Date(obs.validity_time || dateStr).toISOString(),
                    t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u || null,
                    ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                    fxi: obs.fxi10 ? Math.round(obs.fxi10 * 3.6) : null,
                    dd: obs.dd || null,
                    pres: obs.pmer ? Math.round(obs.pmer / 100 * 10) / 10 : null, // Sea level pressure (hPa)
                    rr_per: obs.rr_per || 0
                })).filter(r => r.station_id);

                // Batch Insert
                const { error } = await supabase.from('observations_6mn').upsert(rows, { onConflict: 'station_id, timestamp' });

                if (error) console.log(`❌ DB Error: ${error.message}`);
                else console.log(`✅ ${rows.length} enregistrements`);

            } catch (e) {
                console.log(`❌ Erreur: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 200)); // Pause courte
        }
    }

    // ============================================
    // 2. DONNÉES HORAIRES (Check simple)
    // ============================================
    // On ne récupère l'horaire que si on a changé d'heure récente
    console.log('\n📊 Check Horaire...');
    // Logique simplifiée : prendre T-1h
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);
    oneHourAgo.setMinutes(0, 0, 0);
    const dateHStr = oneHourAgo.toISOString().split('.')[0] + 'Z';

    // Check if we have it
    const { data: hasH } = await supabase.from('observations_horaire').select('id').eq('timestamp', dateHStr).limit(1);

    if (!hasH || hasH.length === 0) {
        console.log(`📥 Récupération Horaire ${dateHStr}...`);
        try {
            const urlH = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/horaire?date=${dateHStr}&format=json`;
            const resH = await fetch(urlH, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resH.ok) {
                const dataH = await resH.json();
                const rowsH = dataH.map(obs => ({
                    station_id: obs.id || obs.id_station || obs.geo_id_insee,
                    timestamp: new Date(obs.validity_time || dateHStr).toISOString(),
                    t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    u: obs.u || null,
                    ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
                    fxi: obs.fxi ? Math.round(obs.fxi * 3.6) : null,
                    rr1: obs.rr1 || 0
                })).filter(r => r.station_id);

                await supabase.from('observations_horaire').upsert(rowsH, { onConflict: 'station_id, timestamp' });
                console.log(`✅ Horaire mis à jour : ${rowsH.length} stations`);
            }
        } catch (e) { console.log('Erreur Horaire', e.message); }
    } else {
        console.log('✅ Horaire déjà à jour.');
    }

    console.log('\n🎉 Fin de synchronisation.');
}

updateSmart();
