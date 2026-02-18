import fs from 'fs';

async function checkSupabaseStatus() {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
        const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

        console.log('=== DIAGNOSTIC SUPABASE COMPLET ===\n');

        // 1. Check observations_6mn
        const resp6mn = await fetch(`${url}/rest/v1/observations_6mn?select=count`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Range': '0-0',
                'Prefer': 'count=exact'
            }
        });
        const count6mn = resp6mn.headers.get('content-range');
        console.log(`📊 Table observations_6mn: ${count6mn}`);

        // Get latest timestamp
        const latest6mn = await fetch(`${url}/rest/v1/observations_6mn?select=timestamp,station_id&order=timestamp.desc&limit=5`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const data6mn = await latest6mn.json();
        if (data6mn && data6mn.length > 0) {
            console.log(`   Dernier relevé: ${data6mn[0].timestamp}`);
            console.log(`   Stations récentes:`);
            data6mn.forEach((d, i) => {
                console.log(`     ${i + 1}. ${d.station_id} à ${d.timestamp}`);
            });
        }

        console.log('\n');

        // 2. Check observations_horaire
        const respHoraire = await fetch(`${url}/rest/v1/observations_horaire?select=count`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Range': '0-0',
                'Prefer': 'count=exact'
            }
        });
        const countHoraire = respHoraire.headers.get('content-range');
        console.log(`📊 Table observations_horaire: ${countHoraire}`);

        const latestHoraire = await fetch(`${url}/rest/v1/observations_horaire?select=timestamp&order=timestamp.desc&limit=1`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const dataHoraire = await latestHoraire.json();
        if (dataHoraire && dataHoraire.length > 0) {
            console.log(`   Dernier relevé: ${dataHoraire[0].timestamp}`);
        }

        console.log('\n');

        // 3. Check unique stations in 6mn
        const stationsResp = await fetch(`${url}/rest/v1/observations_6mn?select=station_id&order=timestamp.desc&limit=100`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const stationsData = await stationsResp.json();
        const uniqueStations = [...new Set(stationsData.map(s => s.station_id))];
        console.log(`🗺️  Nombre de stations uniques (100 derniers relevés): ${uniqueStations.length}`);
        console.log(`   Exemples: ${uniqueStations.slice(0, 5).join(', ')}`);

        console.log('\n=== FIN DU DIAGNOSTIC ===');

    } catch (e) {
        console.error("❌ Erreur:", e.message);
    }
}

checkSupabaseStatus();
