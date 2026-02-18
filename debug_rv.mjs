async function check() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    console.log(JSON.stringify(data.radar.past.slice(-1), null, 2));
    console.log("Host:", data.host);
}
check();
