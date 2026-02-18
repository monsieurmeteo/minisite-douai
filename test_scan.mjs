
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';
const METEO_FRANCE_API = 'https://public-api.meteofrance.fr/public/DPObs/v1';

async function testScan() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("🔍 Récupération du token depuis Supabase...");
    const { data: secrets } = await supabase
        .from('api_secrets')
        .select('access_token')
        .eq('provider', 'meteo_france')
        .single();

    const token = secrets?.access_token;
    if (!token) {
        console.error("❌ Token non trouvé !");
        return;
    }

    // Stations de test (Paris, Lyon, Marseille)
    const testStations = ['75114001', '69387005', '13055001'];

    console.log(`📡 Scan de ${testStations.length} stations de test...`);

    for (const id of testStations) {
        try {
            const url = `${METEO_FRANCE_API}/station/horaire?id_station=${id}&format=json`;
            const r = await fetch(url, { headers: { 'apikey': token } });

            if (!r.ok) {
                console.error(`❌ Station ${id} : Échec (Code ${r.status})`);
                continue;
            }

            const d = await r.json();
            const items = Array.isArray(d) ? d : [d];
            console.log(`✅ Station ${id} : ${items.length} points récupérés.`);

            const rows = items.map((obs) => ({
                station_id: id,
                timestamp: new Date(obs.validity_time || obs.date_obs).toISOString(),
                t: obs.t !== undefined ? Math.round((obs.t - 273.15) * 10) / 10 : null,
                td: obs.td !== undefined ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                u: obs.u,
                ff: obs.ff !== undefined ? Math.round(obs.ff * 3.6) : null,
                pres: obs.pres
            }));

            const { error } = await supabase
                .from('observations_horaire')
                .upsert(rows, { onConflict: 'station_id, timestamp' });

            if (error) {
                console.error(`❌ Erreur Supabase pour ${id} :`, error.message);
            } else {
                console.log(`💾 Station ${id} : Données sauvegardées.`);
            }
        } catch (e) {
            console.error(`❌ Erreur pour ${id} :`, e.message);
        }
    }
}

testScan();
