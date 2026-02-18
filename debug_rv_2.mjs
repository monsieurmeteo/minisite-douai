async function check() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    console.log("TIME:" + data.radar.past[0].time);
    console.log("HOST:" + data.host);
}
check();
