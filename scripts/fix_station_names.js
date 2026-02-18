import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function fixNames() {
    console.log("🔍 Fetching official Meteo-France station list...");

    try {
        const mfResp = await fetch('https://public-api.meteofrance.fr/public/DPObs/v1/liste-stations?format=json', {
            headers: { 'apikey': token }
        });

        if (!mfResp.ok) {
            throw new Error(`MF API Error: ${mfResp.status}`);
        }

        const text = await mfResp.text();
        const mfMap = new Map();

        // Handle CSV/Semi-colon format if necessary
        if (text.includes(';')) {
            const lines = text.split('\n');
            lines.slice(1).forEach(l => {
                const cols = l.split(';');
                if (cols[0] && cols[2]) {
                    mfMap.set(cols[0].trim(), cols[2].trim());
                }
            });
        } else {
            const list = JSON.parse(text);
            list.forEach(s => mfMap.set(s.id_station, s.nom_station));
        }

        console.log(`✅ Loaded ${mfMap.size} official station names.`);

        console.log("📊 Fetching stations from database (with pagination)...");
        let dbStations = [];
        let from = 0;
        let done = false;

        while (!done) {
            const { data, error } = await supabase
                .from('stations')
                .select('id, name')
                .range(from, from + 999);

            if (error) throw error;
            if (!data || data.length === 0) {
                done = true;
            } else {
                dbStations = dbStations.concat(data);
                from += 1000;
            }
        }

        console.log(`Checking ${dbStations.length} stations...`);

        let updateCount = 0;
        for (const dbS of dbStations) {
            const officialName = mfMap.get(dbS.id);

            if (officialName && officialName.trim() !== dbS.name.trim()) {
                // Log specific case
                if (dbS.id === '44184001') {
                    console.log(`📍 Fixing target station 44184001: "${dbS.name}" -> "${officialName}"`);
                }

                const { error: upError } = await supabase
                    .from('stations')
                    .update({ name: officialName })
                    .eq('id', dbS.id);

                if (!upError) {
                    updateCount++;
                } else {
                    console.error(`❌ Failed to update ${dbS.id}: ${upError.message}`);
                }
            }
        }

        console.log(`\n🎉 TERMINÉ ! ${updateCount} noms de stations mis à jour.`);

    } catch (err) {
        console.error("❌ Erreur critique:", err.message);
    }
}

fixNames();
