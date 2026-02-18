
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stationsPath = path.join(__dirname, '../src/data/stations_list.json');
const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

const stations = stationsData.features.filter(f => f.properties.nom.includes("VALENCIENNES"));

console.log(JSON.stringify(stations, null, 2));
