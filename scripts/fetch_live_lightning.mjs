
import fs from 'fs';
import https from 'https';

const url = 'https://www.mwattest.fr/ORAGE/images/foudre.jpg';
const dest = './public/archives-foudre/live_agate_foudre.jpg';

async function downloadImage() {
    console.log(`📥 Tentative de téléchargement de l'image live : ${url}`);

    https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error(`❌ Erreur : Code ${res.statusCode}`);
            return;
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log(`✅ Image enregistrée sous : ${dest}`);
        });
    }).on('error', (err) => {
        console.error(`❌ Erreur réseau : ${err.message}`);
    });
}

downloadImage();
