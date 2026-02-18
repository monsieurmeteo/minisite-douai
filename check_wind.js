
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
let count = 0;
let total = 0;
let examples = [];
for (const id in data) {
    total++;
    const r = data[id].records;
    if (r && r.maxWind && r.maxWind.vals && r.maxWind.vals.length > 0) {
        count++;
        if (examples.length < 3) examples.push({ id, vals: r.maxWind.vals });
    }
}
console.log(`Total stations: ${total}`);
console.log(`Stations with wind records: ${count}`);
console.log('Examples:', examples);
