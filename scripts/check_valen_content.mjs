
import https from 'https';

function fetchStation(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchStation(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                resolve(buffer.toString('latin1'));
            });
        }).on('error', reject);
    });
}

const url = "https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/REF_STATION/FICHECLIM_59606004.data";

fetchStation(url).then(text => {
    console.log("--- START CONTENT ---");
    const lines = text.split('\n');
    console.log("BLOCK 100-200:");
    for (let i = 100; i <= 200; i++) {
        if (lines[i]) console.log(`${i}: ${lines[i].trim()}`);
    }

    // Check for 136 (km/h) or 38 (m/s)
    const targets = ['136', '38'];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Search for number in CSV parts
        const parts = line.split(';');
        for (const p of parts) {
            const val = p.trim().replace(',', '.'); // Normalize
            if (targets.some(t => val.startsWith(t) && (val.length === t.length || val[t.length] === '.'))) {
                console.log(`MATCH VALUE '${val}' at LINE ${i}`);
                console.log(`CONTENT: ${line.trim()}`);
                console.log("CONTEXT ABOVE:");
                for (let j = 5; j >= 1; j--) {
                    if (lines[i - j]) console.log(`${i - j}: ${lines[i - j].trim()}`);
                }
            }
        }
    }
    console.log("--- END CONTENT ---");
});
