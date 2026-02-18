async function testColors() {
    const host = 'https://tilecache.rainviewer.com';
    const ts = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

    // Test 256px tiles for different schemes
    const schemes = [1, 2, 6, 8];

    console.log(`Testing schemes for recent TS: ${ts}`);

    for (const id of schemes) {
        const url = `${host}/v2/radar/${ts}/256/6/32/22/${id}/1_1.png`;
        console.log(`\nScheme ${id}: ${url}`);
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log(`Length: ${res.headers.get('content-length')}`);
    }
}

testColors();
