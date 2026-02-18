async function testUrl() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const ts = data.radar.past[data.radar.past.length - 1].time;
    const host = data.host;

    const url1 = `${host}/v2/radar/${ts}/512/6/32/22/2/1_1.png`;
    const res1 = await fetch(url1);
    console.log("URL1_STATUS:" + res1.status);

    const url2 = `${host}/${ts}/512/6/32/22/2/1_1.png`;
    const res2 = await fetch(url2);
    console.log("URL2_STATUS:" + res2.status);
}
testUrl();
