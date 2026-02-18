async function testUrl() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const ts = data.radar.past[data.radar.past.length - 1].time;
    const host = data.host;

    // Pattern 1: With /v2/radar/
    const url1 = `${host}/v2/radar/${ts}/512/6/32/22/2/1_1.png`;
    // Pattern 2: Without /v2/radar/
    const url2 = `${host}/${ts}/512/6/32/22/2/1_1.png`;

    console.log("Testing URL 1:", url1);
    const res1 = await fetch(url1);
    console.log("URL 1 Status:", res1.status);

    console.log("Testing URL 2:", url2);
    const res2 = await fetch(url2);
    console.log("URL 2 Status:", res2.status);
}
testUrl();
