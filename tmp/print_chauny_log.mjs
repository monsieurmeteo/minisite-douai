import fs from 'fs';
const text = fs.readFileSync('tmp/chauny_log.txt', 'utf16le');
const lines = text.split('\r\n').filter(line => line.includes('2026-02-') || line.includes('2026-03-'));
for (let i = 0; i < Math.min(lines.length, 20); i++) {
    console.log(lines[i].trim());
}
console.log(`Total relevant lines: ${lines.length}`);
