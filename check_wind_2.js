
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
let count = 0;
let total = 0;
let examples = [];
for (const id in data) {
    total++;
    const station = data[id];
    if (station.maxWind || (station.records && station.records.wind)) {
        count++;
        examples.push({ id, maxWind: station.maxWind, recs: station.records.wind });
        if (examples.length > 3) break;
    }
}
console.log(`Total stations: ${total}`);
console.log(`Stations with top-level maxWind or records.wind: ${count}`);
console.log('Examples:', examples);
