import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// const METEO_TOKEN = process.env.VITE_METEO_FRANCE_TOKEN || "votre_token_ici"; // Assurez-vous d'avoir le token

const supabase = createClient(supabaseUrl, supabaseKey);

// Stations à traiter (On peut récupérer la liste depuis la base)
async function getStations() {
    // Pour tester vite, on peut juste prendre Douai et Lille
    // const { data } = await supabase.from('stations_metropole').select('id');
    // return data || [];

    // Mode prioritaire : Douai et Orléans
    return [
        { id: '59178001' }, // Douai
        { id: '45055001' }, // Orléans
        { id: '59606001' }, // Valenciennes
        { id: '59343001' }, // Lille-Lesquin
        { id: '75114001' }  // Paris-Montsouris
    ];
}

async function runRecovery() {
    console.log("🚀 Démarrage du rattrapage données 6MN (Janvier 2026)...");

    // 1. Récupération du Token
    const { data: secret, error: secretError } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    if (secretError || !secret?.access_token) {
        console.error("❌ ERREUR FATALE: Impossible de récupérer le token MF depuis api_secrets.");
        return;
    }
    const METEO_TOKEN = secret.access_token;
    console.log("🔑 Token Météo-France récupéré.");

    const stations = await getStations();
    console.log(`📋 ${stations.length} stations prioritaires à traiter.`);

    // Période : Janvier 2026 en entier
    // L'API 6mn refuse souvent les trop longues périodes. On fait jour par jour ou par paquet.
    // L'API est limitée à ??? points. 6mn = 240 pts/jour.

    // On va faire tout le mois de Janvier jusqu'au 26.
    const start = new Date(Date.UTC(2026, 0, 1));
    const today = new Date(); // 26 Janvier

    for (const station of stations) {
        console.log(`\n📡 Traitement Station ${station.id}...`);

        try {
            // Appel API 6mn
            // Format date : ISO8601
            const url = `https://public-api.meteofrance.fr/public/DPObs/v1/station/infrahoraire-6m?id_station=${station.id}&date_debut=2026-01-01T00:00:00Z&date_fin=2026-01-26T23:59:59Z&format=json`;

            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${METEO_TOKEN}` } // Token public ??
            });

            if (!resp.ok) {
                console.error(`❌ Erreur API (${resp.status}) pour ${station.id}: ${resp.statusText}`);
                // Si 401/403 : Token invalide
                // Si 413/400 : Période trop longue
                continue;
            }

            const data = await resp.json();

            if (!data || data.length === 0) {
                console.log(`⚠️ Aucune donnée 6mn trouvée.`);
                continue;
            }

            console.log(`✅ ${data.length} points 6mn récupérés.`);

            // Transformation
            const records = data.map(d => ({
                station_id: station.id,
                timestamp: new Date(d.validity_time || d.date_obs).toISOString(),
                t: d.t !== null ? Math.round((d.t - 273.15) * 10) / 10 : null, // Kelvin -> Celcius
                rr: d.rr, // RR 6mn
                // On peut ajouter d'autres champs si la table 6mn le permet (ff, dd, u...)
            }));

            // Insertion par lots de 1000
            for (let i = 0; i < records.length; i += 1000) {
                const batch = records.slice(i, i + 1000);
                const { error } = await supabase
                    .from('observations_6mn')
                    .upsert(batch, { onConflict: 'station_id,timestamp' });

                if (error) console.error("❌ Erreur Insert Supabase:", error.message);
                else process.stdout.write(".");
            }
            console.log(" OK");

        } catch (err) {
            console.error("🔥 Crash:", err.message);
        }
    }
}

// NOTE: Ce script nécessite un token Météo-France valide dans l'env (.env.local)
// TOKEN_METEO_FRANCE = ...

runRecovery();
