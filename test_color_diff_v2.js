async function testColorsValid() {
    const host = 'https://tilecache.rainviewer.com';

    // 1. Get a VALID timestamp
    const metaRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const meta = await metaRes.json();
    const ts = meta.radar.past[meta.radar.past.length - 1].time; // Last available past frame

    // Test 256px tiles for different schemes
    const schemes = [1, 2, 6, 8];

    console.log(`Testing schemes for VALID TS: ${ts}`);
    console.log(`Map: https://www.rainviewer.com/map.html?loc=50.37,3.08,6&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=1&c=1&o=83&lm=1&layer=radar&sm=1&sn=1`);

    for (const id of schemes) {
        // Construct URL
        const url = `${host}/v2/radar/${ts}/256/6/32/22/${id}/1_1.png`;
        console.log(`\nScheme ${id}: ${url}`);

        try {
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            if (res.status === 200) {
                const blob = await res.blob();
                console.log(`Size: ${blob.size} bytes`);
            } else {
                console.log("Error fetching.");
            }
        } catch (e) {
            console.log("Fetch failed:", e.message);
        }
    }
}

testColorsValid();
