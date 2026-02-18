import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const stationsToCheck = [
    '02000400',
    '18172001',
    '36044001',
    '39485002',
    '43234001',
    '50218001'
];

async function checkSpecificStations() {
    console.log("🔍 Vérification des stations spécifiques...\n");

    for (const id of stationsToCheck) {
        // Check Metadata
        const { data: meta, error: metaErr } = await supabase
            .from('stations')
            .select('id, name')
            .eq('id', id)
            .maybeSingle();

        // Check recent data (last 7 days to be broad)
        const { count, error: countErr } = await supabase
            .from('observations_6mn')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', id);

        if (meta) {
            console.log(`✅ [${id}] - ${meta.name} : ${count || 0} observations en base.`);
        } else {
            // Try to see if it even exists in observations without metadata
            if (count > 0) {
                console.log(`⚠️ [${id}] - SANS MÉTADONNÉES : ${count} observations trouvées.`);
            } else {
                console.log(`❌ [${id}] - Non trouvée (ni méta, ni data).`);
            }
        }
    }
}

checkSpecificStations();
