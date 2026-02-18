
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
const valen = data['59606004'];
if (valen) {
    console.log(JSON.stringify(valen.records.maxWind, null, 2));
} else {
    console.log('Station not found');
}
