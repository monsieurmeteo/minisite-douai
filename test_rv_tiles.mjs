async function checkTiles() {
    // 1. Get a valid timestamp
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const ts = data.radar.past[data.radar.past.length - 1].time;
    const host = data.host; // e.g., https://tilecache.rainviewer.com

    console.log(`Checking tiles for Time: ${ts} on Host: ${host}`);

    // 2. Test 256px tile (Zoom 6, standard frame)
    const url256 = `${host}/v2/radar/${ts}/256/6/32/22/6/1_1.png`;
    console.log("Testing 256px:", url256);
    const res256 = await fetch(url256);
    console.log("256px Status:", res256.status);

    // 3. Test 512px tile (Zoom 6)
    const url512 = `${host}/v2/radar/${ts}/512/6/32/22/6/1_1.png`;
    console.log("Testing 512px:", url512);
    const res512 = await fetch(url512);
    console.log("512px Status:", res512.status);

    // 4. Test Deep Zoom tile (Zoom 13 - beyond maxNativeZoom 12?)
    // Coordinates need to match zoom 13. Center of France approx.
    const urlZoom13 = `${host}/v2/radar/${ts}/256/13/4116/2855/6/1_1.png`;
    console.log("Testing Zoom 13 (256px):", urlZoom13);
    const resZoom13 = await fetch(urlZoom13);
    console.log("Zoom 13 Status:", resZoom13.status);

}
checkTiles();
