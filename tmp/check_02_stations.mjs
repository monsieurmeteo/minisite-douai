async function findAisneStations() {
    try {
        const res = await fetch('https://www.meteociel.fr/temps-reel/obs_villes.php?region=02');
        const buffer = await res.arrayBuffer();
        const html = new TextDecoder('windows-1252').decode(buffer);

        const chaunyMatch = html.match(/<option[^>]*value=\"(\d+)\"[^>]*>([^<]*chauny[^<]*)<\/option>/i);
        if (chaunyMatch) {
            console.log('Found Chauny id: ' + chaunyMatch[1] + ' (' + chaunyMatch[2] + ')');
        } else {
            console.log('Chauny not found. All stations for departamento 02:');
            const allMatches = [...html.matchAll(/<option[^>]*value=\"(\d+)\"[^>]*>(.*?)<\/option>/gi)];
            allMatches.forEach(m => console.log(m[1] + ': ' + m[2].trim()));
        }
    } catch (e) {
        console.error(e);
    }
}
findAisneStations();
