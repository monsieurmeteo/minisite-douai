async function inspectChaunyHTML() {
    try {
        const fetchMeteocielHTML = async (stationId, date) => {
            const d = new Date(date);
            const day = d.getDate();
            const month = d.getMonth();
            const year = d.getFullYear();
            const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            return new TextDecoder('windows-1252').decode(buffer);
        }

        const html = await fetchMeteocielHTML('02173001', '2026-02-01');

        const theadMatch = html.match(/<tr bgcolor=#CCDDFF>[^]*?<\/tr>/i);
        if (theadMatch) {
            console.log("Headers:");
            const ths = theadMatch[0].match(/<td[^>]*>.*?<\/td>/gi);
            ths.forEach((th, i) => console.log(i, th.replace(/<[^>]*>/g, '').trim()));
        }

    } catch (e) {
        console.error(e);
    }
}
inspectChaunyHTML();
