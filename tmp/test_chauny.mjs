async function testChauny() {
    try {
        const fetchMeteocielHTML = async (stationId, date) => {
            const d = new Date(date);
            const day = d.getDate();
            const month = d.getMonth();
            const year = d.getFullYear();
            const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;
            console.log("Fetching: " + url)
            const response = await fetch(url);
            if (!response.ok) return null;
            const buffer = await response.arrayBuffer();
            return new TextDecoder('windows-1252').decode(buffer);
        }

        const parseMeteociel = (html) => {
            const observations = [];
            const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+h\d*)<\/td>([\s\S]*?)<\/tr>/gi;
            let match;
            while ((match = rowRegex.exec(html)) !== null) {
                const timeStr = match[1];
                const cellsHtml = match[2];
                const cells = cellsHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                if (cells.length < 4) continue;

                const parts = timeStr.split('h');
                const hour = parseInt(parts[0]);
                const minute = parseInt(parts[1]) || 0;
                const getVal = (idx) => {
                    if (!cells[idx]) return null;
                    const txt = cells[idx].replace(/<[^>]*>/g, '').trim();
                    if (!txt || txt === '&nbsp;' || txt === '\u00A0' || txt === '-') return null;
                    const val = parseFloat(txt.replace(/[^\d.-]/g, '').replace(',', '.'));
                    return isNaN(val) ? null : val;
                };

                const rainTxt = cells[cells.length - 1].toLowerCase();
                let rr = getVal(cells.length - 1);
                if (rainTxt.includes('aucune') || rainTxt.includes('traces')) rr = 0;

                observations.push({ hour, minute, rainTxt, parsedRr: rr, cols: cells.length });
            }
            return observations;
        }

        const html = await fetchMeteocielHTML('02173001', '2026-02-01');
        const obs = parseMeteociel(html);
        console.log(`Found ${obs.length} valid rows.`);
        console.log(obs.slice(0, 5));
    } catch (e) {
        console.error(e);
    }
}
testChauny();
