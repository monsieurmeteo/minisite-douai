
import fs from 'fs';

const FILE = 'src/data/all_stations_records.json';
const ID = '59606004';

let data = {};
try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
    console.error("Failed to read file", e);
    process.exit(1);
}

if (!data[ID]) data[ID] = { records: {} };
if (!data[ID].records) data[ID].records = {};

// Manual update for Valenciennes (based on User inputs)
// Jan: 133.2 (25-1990)
// Abs: 136.8 (1990)
const windVals = new Array(13).fill(null);
const windDates = new Array(13).fill(null);

windVals[0] = 133.2; // Jan
windDates[0] = "25-01-1990"; // Inferred date format

windVals[12] = 136.8; // Year
windDates[12] = "1990";

data[ID].records.maxWind = {
    vals: windVals,
    dates: windDates,
    period: ["1987-2025"] // Estimated from screenshots
};

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`Updated Valenciennes (${ID}) wind records manually.`);
