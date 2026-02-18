
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.VITE_METEO_MANUAL_TOKEN;
const stationId = '35281001'; // Rennes St-Jacques

async function test() {
    console.log(`Using token: ${token.substring(0, 10)}...`);
    const now = new Date();
    // Round to 6 min
    const cycleTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), Math.floor(now.getUTCMinutes() / 6) * 6, 0, 0));
    cycleTime.setMinutes(cycleTime.getMinutes() - 30);
    const iso = cycleTime.toISOString().split('.')[0] + 'Z';

    const url = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?id_station=${stationId}&date=${iso}&format=json`;
    console.log(`Fetching: ${url}`);

    try {
        const res = await fetch(url, {
            headers: {
                'apikey': token,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.log(text);
            return;
        }

        const data = await res.json();
        console.log('Results length:', data.length);
        if (data.length > 0) {
            console.log('Fields in first entry:', Object.keys(data[0]));
            console.log('Full first entry:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No data found for this cycle.');
            // Try without date to get latest
            const urlLatest = `https://public-api.meteofrance.fr/public/DPPaquetObs/v1/paquet/stations/infrahoraire-6m?id_station=${stationId}&format=json`;
            console.log(`Fetching latest: ${urlLatest}`);
            const res2 = await fetch(urlLatest, {
                headers: {
                    'apikey': token,
                    'Authorization': `Bearer ${token}`
                }
            });
            const data2 = await res2.json();
            console.log('Latest results length:', data2.length);
            if (data2.length > 0) {
                console.log('Full latest entry:', JSON.stringify(data2[0], null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    }
}

test();
