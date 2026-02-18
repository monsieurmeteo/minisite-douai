import https from 'https';

const BASE_URL = 'https://www.mwattest.fr';
const DATA_PATH = '/ORAGE/orage/ws/wsOragesGMaps.php';
const IMG_PATH = '/ORAGE/images/foudre.jpg';
const PASS = 'jh2kH3,R';

function checkUrl(url, label) {
    return new Promise((resolve) => {
        console.log(`\n----------------------------------------`);
        console.log(`Testing ${label}: ${url}`);
        const req = https.get(url, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    if (res.headers['content-type'].includes('image')) {
                        console.log(`[SUCCESS] Image found, size: ${data.length} bytes`);
                    } else if (res.headers['content-type'].includes('json')) {
                        console.log(`[SUCCESS] JSON Data received: ${data.substring(0, 100)}...`);
                    } else {
                        console.log(`[WARNING] Unexpected Content-Type. Preview:`);
                        console.log(data.substring(0, 200).replace(/\n/g, ' '));
                        // Check for title
                        const titleMatch = data.match(/<title>(.*?)<\/title>/i);
                        if (titleMatch) console.log(`Page Title: ${titleMatch[1]}`);
                    }
                } else {
                    console.log(`[ERROR] Request failed.`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[FATAL] Network Error: ${e.message}`);
            resolve();
        });
    });
}

async function run() {
    await checkUrl(`${BASE_URL}${IMG_PATH}`, 'Static Image');
    const userDate = '20260128';
    await checkUrl(`${BASE_URL}${DATA_PATH}?date=${userDate}&heureD=00&heureF=23&pass=${PASS}`, 'API User Date (2026)');
    const pastDate = '20240715';
    await checkUrl(`${BASE_URL}${DATA_PATH}?date=${pastDate}&heureD=00&heureF=23&pass=${PASS}`, 'API Past Date (2024)');
}

run();
