
import fs from 'fs';

const FILE = 'src/data/all_stations_records.json';
let data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let fixedCount = 0;
let totalStations = 0;

for (const id in data) {
    totalStations++;
    const station = data[id];
    if (station.records && station.records.maxWind && station.records.maxWind.vals) {
        const vals = station.records.maxWind.vals;
        const validVals = vals.filter(v => v !== null && v > 0);

        if (validVals.length > 0) {
            const maxVal = Math.max(...validVals);

            // If the max recorded gust is < 100, it's almost certainly m/s (or very protected station)
            // But a station like Mont Aigoual having 61 is definitely m/s.
            if (maxVal < 100) {
                console.log(`Fixing station ${id} (${station.name || '?'}) : Max was ${maxVal.toFixed(1)} -> converting to km/h`);
                station.records.maxWind.vals = vals.map(v => v !== null ? v * 3.6 : null);
                fixedCount++;
            }
        }
    }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`\n✅ Sanity check complete.`);
console.log(`📊 Stations analyzed: ${totalStations}`);
console.log(`🛠️ Stations converted from m/s to km/h: ${fixedCount}`);
