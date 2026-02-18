import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function fetchAllStationNames() {
    try {
        // Récupérer le token
        const { data: secrets } = await supabase
            .from('api_secrets')
            .select('access_token')
            .eq('provider', 'meteo_france')
            .single();

        if (!secrets?.access_token) {
            console.error('No token found');
            return;
        }

        // Appeler l'API Météo France
        const response = await fetch(
            'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/liste-stations/infrahoraire-6m?format=json',
            {
                headers: { 'Authorization': `Bearer ${secrets.access_token}` }
            }
        );

        if (!response.ok) {
            console.error('API call failed:', response.status);
            return;
        }

        const allStations = await response.json();
        const stationNames = {};

        allStations.forEach(st => {
            const id = st.id || st.id_station;
            const name = st.nom || st.name || '';
            const commune = st.nom_commune || st.commune || '';
            stationNames[id] = commune || name || id;
        });

        // Sauvegarder dans un fichier JSON
        fs.writeFileSync(
            'src/data/allStationNames.json',
            JSON.stringify(stationNames, null, 2)
        );

        console.log(`✅ Created allStationNames.json with ${Object.keys(stationNames).length} stations`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fetchAllStationNames();
