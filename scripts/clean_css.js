const fs = require('fs');
const path = 'src/modules/crues/CruesDashboard.css';

try {
    let content = fs.readFileSync(path, 'utf8');
    // Trouver l'index de la dernière fermeture de media query valide
    // On sait que le contenu dupliqué commence après le dernier "}" de la media query 480px

    const validEndMarker = '.stat-value {\n        font-size: 1.5rem;\n    }\n}';
    const lastIndex = content.lastIndexOf(validEndMarker);

    if (lastIndex !== -1) {
        // Garder tout jusqu'à la fin du marqueur valide
        const newContent = content.substring(0, lastIndex + validEndMarker.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('✅ Fichier nettoyé avec succès');
    } else {
        console.log('❌ Marqueur non trouvé, nettoyage manuel requis');
    }
} catch (e) {
    console.error('Erreur:', e);
}
