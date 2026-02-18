
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

// Ensure structure exists
if (!data[ID].records.maxWind) {
    data[ID].records.maxWind = { vals: new Array(13).fill(null), dates: new Array(13).fill(null) };
}

// User correction: 129.6 km/h for January
console.log("Updating January record to 129.6 km/h");

// Updating January (Index 0)
// Assuming user intends this for the current month relevant record or specific January record.
// Given current month is January (Context: "RECORD JAN" in previous screenshot), this fits.
data[ID].records.maxWind.vals[0] = 129.6;
// Retain date if possible, or leave as is if unknown, but user mentioned "rafale du jour" comparison.

// If absolute was 136.8 (38 m/s), I'll leave it unless told otherwise, 
// but user said "c'est pas 133, c'est 129,6". 133.2 was in the previous screenshot for JAN.
// So 129.6 replaces 133.2.

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`✅ Updated Valenciennes (${ID}) wind records: Jan set to 129.6 km/h.`);
