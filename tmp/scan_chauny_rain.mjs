async function scanChaunyFeb() {
    try {
        const stationId = '02173001';
        let totalVal = 0;
        for (let d = 1; d <= 28; d++) {
            const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${d}&mois2=1&annee2=2026&affint=1`;
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const html = new TextDecoder('windows-1252').decode(buffer);

            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let m;
            let dayRain = 0;
            while ((m = trRegex.exec(html)) !== null) {
                if (m[1].includes('h')) {
                    const cells = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                    if (cells.length > 9) {
                        const r6 = cells[9].replace(/<[^>]*>/g, '').trim();
                        if (r6 && !r6.includes('&nbsp;')) {
                            const val = parseFloat(r6.replace(',', '.'));
                            if (!isNaN(val)) dayRain += val;
                        }
                    }
                }
            }
            if (dayRain > 0) {
                console.log(`Day ${d}: ${dayRain.toFixed(1)} mm`);
                totalVal += dayRain;
            }
        }
        console.log(`Total Feb (Cols 9): ${totalVal.toFixed(1)} mm`);
    } catch (e) {
        console.error(e);
    }
}
scanChaunyFeb();
