
import fs from 'fs';

const FILE = 'src/data/all_stations_records.json';
let data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let fixCount = 0;
let total = 0;

for (const id in data) {
    total++;
    const station = data[id];
    if (station.records && station.records.maxWind && station.records.maxWind.vals) {
        const vals = station.records.maxWind.vals;
        const validVals = vals.filter(v => v !== null);
        if (validVals.length === 0) continue;

        const currentMax = Math.max(...validVals);
        const isMetropole = !id.startsWith('97') && !id.startsWith('98');

        // ERROR DETECTION: 
        // In mainland France, a record > 250 km/h is nearly impossible in these files
        // (except maybe very specific caps, but even then 300+ is a bug)
        // If currentMax > 280, it's 100% an error from the previous 3.6 multiplication.

        if (isMetropole && currentMax > 250) {
            console.log(`⚠️  Suspected error at ${id} (${station.name}): ${currentMax.toFixed(1)} km/h. Backtracking...`);
            station.records.maxWind.vals = vals.map(v => v !== null ? v / 3.6 : null);
            fixCount++;
        }

        // Final sanity check on the unit
        const newMax = Math.max(...station.records.maxWind.vals.filter(v => v !== null));

        // If after "unfixing" or if originally, the max is still < 65, it is LIKELY m/s
        // because 65 km/h (18 m/s) is way too low for a monthly wind record in France.
        if (newMax < 65) {
            console.log(`ℹ️  Station ${id} (${station.name}) looks like m/s (Max: ${newMax.toFixed(1)}). Converting to km/h...`);
            station.records.maxWind.vals = station.records.maxWind.vals.map(v => v !== null ? v * 3.6 : null);
        }
    }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`\n✅ Repair complete.`);
console.log(`📊 Analyzed: ${total}`);
console.log(`🛠️  Mistakes fixed: ${fixCount}`);
