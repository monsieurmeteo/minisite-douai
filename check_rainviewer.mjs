async function checkRainViewer() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        console.log("Timestamps past:", data.radar.past.length);
        console.log("Last timestamp:", data.radar.past[data.radar.past.length - 1]);

        const ts = data.radar.past[data.radar.past.length - 1];
        const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/512/6/32/22/2/1_1.png`;
        console.log("Sample Tile URL (France):", tileUrl);

        const tileCheck = await fetch(tileUrl);
        console.log("Tile Status:", tileCheck.status);
        console.log("Tile Type:", tileCheck.headers.get('content-type'));
    } catch (e) {
        console.error(e);
    }
}
checkRainViewer();
