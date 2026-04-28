async function searchChaunyClima() {
    try {
        const res = await fetch('https://www.meteociel.fr/climatologie/villes.php');
        const buffer = await res.arrayBuffer();
        const html = new TextDecoder('windows-1252').decode(buffer);

        const possibleIds = [...html.matchAll(/villes\.php\?code2=(\d+)[^>]*>([^<]*Chauny[^<]*)/gi)];
        if (possibleIds.length > 0) {
            console.log("Found Chauny IDs in climatology on Meteociel:");
            possibleIds.forEach(m => console.log(m[1], m[2]));
        } else {
            console.log("Chauny not found in climatology on Meteociel.");
        }
    } catch (e) {
        console.error(e);
    }
}
searchChaunyClima();
