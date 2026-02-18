async function testSmoothing() {
    const host = 'https://tilecache.rainviewer.com';
    const metaRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const meta = await metaRes.json();
    const ts = meta.radar.past[meta.radar.past.length - 1].time;

    // Scheme 2 (Meteo France)
    const smoothUrl = `${host}/v2/radar/${ts}/256/6/32/22/2/1_1.png`;
    const pixelUrl = `${host}/v2/radar/${ts}/256/6/32/22/2/0_1.png`;

    console.log(`Testing Smoothing for TS: ${ts}`);
    console.log(`Smooth: ${smoothUrl}`);
    console.log(`Pixel : ${pixelUrl}`);

    const r1 = await fetch(smoothUrl);
    const r2 = await fetch(pixelUrl);

    console.log(`Smooth Status: ${r1.status}`);
    console.log(`Pixel Status : ${r2.status}`);
}
testSmoothing();
