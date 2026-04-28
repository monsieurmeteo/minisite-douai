async function scanChaunyDeep5() {
    try {
        const stationId = '02173';
        for (let d = 1; d <= 28; d++) {
            const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${d}&mois2=1&annee2=2026&affint=1`;
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const html = new TextDecoder('windows-1252').decode(buffer);

            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let m;
            let foundDay = false;
            while ((m = trRegex.exec(html)) !== null) {
                if (m[1].includes('h')) {
                    const cells = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                    for (let i = 0; i < cells.length; i++) {
                        const txt = cells[i].replace(/<[^>]*>/g, '').trim().replace(/&nbsp;/g, '');
                        if (txt.match(/\d/)) {
                            if (i > 0) { // skip time
                                console.log(`Day ${d}, Column ${i}: ${txt}`);
                                foundDay = true;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
scanChaunyDeep5();
