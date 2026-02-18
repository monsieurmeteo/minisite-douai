
async function exploreVigicrues() {
    try {
        console.log('Fetching territories...');
        const response = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/TerEntVigiCru.json');
        const territories = await response.json();
        console.log('--- Territoires Vigicrues ---');
        const tList = territories.TerEntVigiCru || [];
        tList.forEach(t => {
            console.log(`[${t.CdEntVigiCru}] ${t.LbEntVigiCru}`);
        });

        console.log('\nFetching stations...');
        const stationsRes = await fetch('https://www.vigicrues.gouv.fr/services/v1.1/StaEntVigiCru.json');
        const stations = await stationsRes.json();
        const sList = stations.StaEntVigiCru || [];

        console.log('\n--- Stations à Douai ou sur la Scarpe ---');
        const filtered = sList.filter(s =>
            s.LbEntVigiCru.toLowerCase().includes('douai') ||
            s.LbEntVigiCru.toLowerCase().includes('scarpe')
        );
        filtered.forEach(s => {
            console.log(`[${s.CdEntVigiCru}] ${s.LbEntVigiCru} - Code: ${s.CdEntVigiCru}`);
        });
    } catch (error) {
        console.error('Error fetching Vigicrues data:', error);
    }
}

exploreVigicrues();
