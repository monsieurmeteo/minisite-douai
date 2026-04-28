async function searchChauny() {
    try {
        const res = await fetch('https://www.meteociel.fr/observations-meteo/temps-reel.php');
        const buffer = await res.arrayBuffer();
        const html = new TextDecoder('windows-1252').decode(buffer);

        const possibleIds = [...html.matchAll(/villes\.php\?code2=(\d+)[^>]*>([^<]*Chauny[^<]*)/gi)];
        if (possibleIds.length > 0) {
            console.log("Found Chauny IDs on Meteociel:");
            possibleIds.forEach(m => console.log(m[1], m[2]));
        } else {
            console.log("Chauny not found in global list on Meteociel.");
        }
    } catch (e) {
        console.error(e);
    }
}
searchChauny();
