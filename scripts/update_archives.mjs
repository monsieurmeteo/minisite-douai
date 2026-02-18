
import fs from 'fs';
import path from 'path';

const archivesDir = './public/archives-foudre';
const outputFile = './src/data/foudre_archives_list.json';

function update() {
    try {
        if (!fs.existsSync(archivesDir)) {
            console.error(`Le dossier ${archivesDir} n'existe pas.`);
            return;
        }

        const files = fs.readdirSync(archivesDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.jpg'))
            .map(file => ({ Name: file }));

        fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
        console.log(`✅ Liste des archives mise à jour : ${files.length} images trouvées.`);
    } catch (e) {
        console.error("Erreur lors de la mise à jour :", e.message);
    }
}

update();
