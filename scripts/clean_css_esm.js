import fs from 'fs';

const path = 'src/modules/crues/CruesDashboard.css';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Le marqueur de fin valide
    const validEndMarker = '.stat-value {\n        font-size: 1.5rem;\n    }\n}';
    const lastIndex = content.lastIndexOf(validEndMarker);

    if (lastIndex !== -1) {
        const newContent = content.substring(0, lastIndex + validEndMarker.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('✅ Fichier nettoyé avec succès');
    } else {
        console.log('❌ Marqueur non trouvé');
        // Tentative alternative avec un marqueur plus court
        const shortMarker = '@media (max-width: 480px) {';
        const idx = content.lastIndexOf(shortMarker);
        if (idx !== -1) {
            // Chercher la fermeture correspondante '}'
            // C'est risqué sans parser, mais le fichier est simple à la fin
            // On va assumer que le fichier doit s'arrêter 3 lignes après le dernier 'font-size: 1.5rem;'
        }
    }
} catch (e) {
    console.error('Erreur:', e);
}
