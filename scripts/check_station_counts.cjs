const https = require('https');
const fs = require('fs');

const CONSUMER_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const CONSUMER_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';
const OAUTH_URL = 'https://portail-api.meteofrance.fr/token';

async function getToken() {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const response = await fetch(OAUTH_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

async function checkCounts() {
    try {
        const token = await getToken();
        console.log('Token obtained.');

        // 1. Check LISTE-STATIONS (Declared stations in the API)
        const listUrl = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/liste-stations?format=json';
        console.log(`Checking ${listUrl}...`);

        const resList = await fetch(listUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        if (resList.ok) {
            const dataList = await resList.json();
            console.log(`\n📋 Stations declared in 'liste-stations' endpoint: ${dataList.length}`);
            if (dataList.length > 0) console.log('Sample:', dataList[0]);
        } else {
            console.log(`\n❌ Failed to check liste-stations: ${resList.status}`);
        }

        // 2. Check 6MN (Currently active automatic stations)
        // Calculate a recent valid 6mn slot
        const now = new Date();
        const minutes = now.getUTCMinutes();
        const roundedMinutes = Math.floor(minutes / 6) * 6;
        const cycleTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), roundedMinutes, 0, 0));
        cycleTime.setMinutes(cycleTime.getMinutes() - 12);
        const cycleTimeStr = cycleTime.toISOString().split('.')[0] + 'Z';

        const sixMinUrl = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?date=${cycleTimeStr}&format=json`;
        console.log(`\nChecking 6mn data for ${cycleTimeStr}...`);

        const res6mn = await fetch(sixMinUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        if (res6mn.ok) {
            const data6mn = await res6mn.json();
            console.log(`📡 Stations sending data right now (6mn): ${data6mn.length}`);
        } else {
            console.log(`\n❌ Failed to check 6mn: ${res6mn.status}`);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

checkCounts();
