async function parseFullHtml() {
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

        let inTable = false;
        const lines = html.split('\n');
        for (let line of lines) {
            if (line.includes('Heure')) {
                console.log(line);
                break;
            }
        }
    } catch (e) {
        console.error(e);
    }
}
parseFullHtml();
