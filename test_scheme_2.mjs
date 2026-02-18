async function checkScheme2() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const ts = data.radar.past[data.radar.past.length - 1].time;
    const host = 'https://tilecache.rainviewer.com';

    // ID 2: Meteo France
    const id = 2;
    const url = `${host}/v2/radar/${ts}/256/6/32/22/${id}/1_1.png`;

    console.log(`Testing Scheme ${id} (Meteo France) for TS: ${ts}`);
    console.log("URL:", url);

    const r = await fetch(url);
    console.log(`Status: ${r.status}`);
}
checkScheme2();
