
import fs from 'fs';
import path from 'path';

const srcDir = './src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.match(/\.(jsx|tsx|js|ts)$/)) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('.toFixed(')) {
            const isSafe = line.includes('?.toFixed') || line.includes('typeof') || line.includes('??');
            if (!isSafe) {
                console.log(`${file}:${i + 1}: ${line.trim()}`);
            }
        }
    });
});
