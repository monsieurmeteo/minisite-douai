import https from 'https';

const BASE_URL = 'https://www.mwattest.fr';
const DATA_PATH = '/ORAGE/orage/ws/wsOragesGMaps.php';
const PASS = 'jh2kH3,R';

function checkUrl(url, label) {
    return new Promise((resolve) => {
        console.log(`Testing ${label}: ${url}`);
        const req = https.get(url, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Body Length: ${data.length}`);
                console.log(`Preview: ${data.substring(0, 100)}`);
                resolve();
            });
        });
    });
}

async function run() {
    // Check API with User Date (2026)
    const userDate = '20260128';
    await checkUrl(`${BASE_URL}${DATA_PATH}?date=${userDate}&heureD=00&heureF=23&pass=${PASS}`, 'API User Date (2026)');
}

run();
