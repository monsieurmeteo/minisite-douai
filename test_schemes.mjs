async function checkSchemes() {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const ts = data.radar.past[data.radar.past.length - 1].time;
    const host = 'https://tilecache.rainviewer.com';

    // IDs used in the app:
    // 1: Bleu Universel
    // 2: Météo-France
    // 6: Arc-en-Ciel
    // 8: Contrasté
    const schemes = [1, 2, 6, 8];

    console.log(`Testing Schemes for TS: ${ts}`);

    for (const id of schemes) {
        const url = `${host}/v2/radar/${ts}/256/6/32/22/${id}/1_1.png`;
        const r = await fetch(url);
        console.log(`Scheme ${id}: Status ${r.status}`);
        if (r.status !== 200) {
            console.log(`  -> URL: ${url}`);
        }
    }
}
checkSchemes();
