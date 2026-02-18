
// SCRIPT MANUEL NODE.JS POUR LANCER LE ROBOT IMMEDIATEMENT
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Config locale
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const tokenMatch = envContent.match(/VITE_METEO_MANUAL_TOKEN=(.*)/);

if (!urlMatch || !keyMatch || !tokenMatch) { process.exit(1); }

// Utilisation de la clé service role si dispo, sinon anon (attention aux droits)
// Note: Ici on a que la ANON key dans .env.local côté client. 
// Pour l'écriture dans 'observations_horaire', la RLS doit autoriser anon OU on doit simuler un robot.
// Mais le robot officiel a la SERVICE_ROLE_KEY.
// TENTATIVE avec ANON KEY. Si RLS bloque, on le saura.
const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_KEY = keyMatch[1].trim();
// En vrai, il faudrait la service_key pour écrire sans restriction, mais essayons.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPObs/v1';

async function run() {
    console.log("🌍 Démarrage du SCAN NATIONAL (Mode Manuel Node.js)...");

    // On utilise le token directement du fichier .env pour aller plus vite (pas besoin de DB api_secrets ici)
    const token = tokenMatch[1].trim();

    // 3. Récupérer la LISTE OFFICIELLE
    const listUrl = `${METEO_FRANCE_API}/liste-stations?format=json`;
    console.log(`📋 Téléchargement de la liste officielle...`);

    try {
        const listResp = await fetch(listUrl, { headers: { 'apikey': token } });
        let stationsToScan = [];

        if (listResp.ok) {
            const textData = await listResp.text();
            try {
                const listData = JSON.parse(textData);
                if (Array.isArray(listData)) {
                    stationsToScan = listData.map(s => s.id_station);
                }
            } catch (e) {
                // CSV Fallback
                const lines = textData.split('\n');
                stationsToScan = lines.slice(1).map(l => l.split(';')[0]).filter(id => id && id.length >= 5);
            }
            console.log(`✅ ${stationsToScan.length} stations à scanner.`);
        } else {
            throw new Error("Echec liste stations");
        }

        // 4. SCAN MASSIF
        // On réduit le batch pour un script local pour éviter de faire trop ramer ou rate-limit
        // 4. SCAN MASSIF
        // SCAN COMPLET (Production)
        const BATCH_SIZE = 15; // 15 par par paquet pour ne pas saturer l'API

        let totalProcessed = 0;
        let totalSaved = 0;

        const processStation = async (id) => {
            try {
                const url = `${METEO_FRANCE_API}/station/horaire?id_station=${id}&format=json`;
                const r = await fetch(url, { headers: { 'apikey': token } });
                if (!r.ok) return 0;

                const d = await r.json();
                const items = Array.isArray(d) ? d : [d];
                if (items.length === 0) return 0;

                const rows = items.map(obs => ({
                    station_id: id,
                    timestamp: new Date(obs.validity_time || obs.date_obs).toISOString(),
                    t: obs.t !== undefined ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                    td: obs.td !== undefined ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                    u: obs.u,
                    ff: obs.ff !== undefined ? Math.round(obs.ff * 3.6) : null,
                    pres: obs.pres
                }));

                const { error } = await supabase.from('observations_horaire').upsert(rows, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

                if (error) {
                    return 0;
                }
                return rows.length;
            } catch { return 0; }
        };


        console.log(`🚀 SCAN INTÉGRAL : Traitement de ${stationsToScan.length} stations...`);

        // On traite TOUTE la liste cette fois
        const subset = stationsToScan;

        for (let i = 0; i < subset.length; i += BATCH_SIZE) {
            const chunk = subset.slice(i, i + BATCH_SIZE);
            const promises = chunk.map(id => processStation(id));
            const results = await Promise.all(promises);

            totalProcessed += chunk.length;
            totalSaved += results.reduce((a, b) => a + b, 0);
            process.stdout.write(`.`);
        }

        console.log(`\n🎉 TERMINÉ ! ${totalSaved} données enregistrées.`);

        if (totalSaved === 0) {
            console.log("⚠️ 0 donnée sauvegardée : Vérifiez les droits RLS (Politiques d'accès) sur supabase.");
        }

    } catch (e) {
        console.error(e);
    }
}

run();
