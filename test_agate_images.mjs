
async function testUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
            console.log(`[OK] ${url}`);
        } else {
            // console.log(`[FAIL] ${url} (${res.status})`);
        }
    } catch (e) {
        // console.log(`[ERR] ${url} (${e.message})`);
    }
}

const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0].replace(/-/g, '');

const patterns = [
    `https://www.agate-france.com/images/cartes/foudre.gif`,
    `https://www.agate-france.com/images/cartes/foudre.jpg`,
    `https://www.mwattest.fr/ORAGE/images/foudre.jpg`,
    `https://www.mwattest.fr/ORAGE/images/${today}.jpg`,
    `https://www.mwattest.fr/ORAGE/images/orage_${today}.jpg`,
    `https://www.mwattest.fr/ORAGE/photos/orage_${today}.jpg`,
    `https://www.mwattest.fr/ORAGE/archives/${today}.jpg`,
    `https://www.agate-france.com/archive/${today}/foudre.jpg`,
];

async function run() {
    for (const url of patterns) {
        await testUrl(url);
    }
}
run();
