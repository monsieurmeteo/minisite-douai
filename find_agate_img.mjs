
async function findAgateImage() {
    try {
        const res = await fetch('https://www.agate-france.com/');
        const html = await res.text();

        const imgMatches = html.match(/https?:\/\/[^"']+\.(?:jpg|png|gif)/gi);
        if (imgMatches) {
            console.log("Found images:");
            imgMatches.forEach(img => {
                const lower = img.toLowerCase();
                if (lower.includes('foudre') || lower.includes('orage') || lower.includes('impact')) {
                    console.log(`[!] POSSIBLE LIGHTNING IMAGE: ${img}`);
                }
            });
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
findAgateImage();
