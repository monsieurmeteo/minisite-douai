
import https from 'https';
import fs from 'fs';

const URL = 'https://www.meteociel.fr/obs/clim/normales_records.php?code=59606004';
const STATION_ID = '59606004';

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk.toString('latin1')); // Meteociel is often iso-8859-1
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseMeteociel(html) {
    // Look for lines like "Vent max (rafales)"
    // The table usually has columns: Jan, Fev, Mar ... Année

    // Simple heuristic: find "Vent max" and grab following numbers
    // html is messy, but usually cells are <td>...</td>

    // Let's rely on the structure:
    // <tr><td>Vent max (rafales)</td><td>120.0<br>...</td>...</tr>

    const windVals = new Array(13).fill(null);
    const windDates = new Array(13).fill(null);

    // Locate the row
    // Debug: Search for known value
    const knownIdx = html.indexOf('133.2');
    if (knownIdx !== -1) {
        console.log("Found 133.2 at index", knownIdx);
        console.log("Context:", html.substring(knownIdx - 200, knownIdx + 200));
    } else {
        console.log("Could not find 133.2");
        const knownIdx2 = html.indexOf('136.8');
        if (knownIdx2 !== -1) {
            console.log("Found 136.8 at index", knownIdx2);
            console.log("Context:", html.substring(knownIdx2 - 200, knownIdx2 + 200));
        }
    }

    fs.writeFileSync('debug_meteociel.html', html);

    const rowStart = html.indexOf('Vent max (rafales)');
    if (rowStart === -1) {
        console.log("Could not find 'Vent max (rafales)' row");
        return null;
    }

    let cursor = rowStart;
    for (let i = 0; i < 13; i++) {
        // Find next <td>
        const tdStart = html.indexOf('<td', cursor);
        if (tdStart === -1) break;

        const contentStart = html.indexOf('>', tdStart) + 1;
        const contentEnd = html.indexOf('</td>', contentStart);

        let cellContent = html.substring(contentStart, contentEnd);
        // cellContent looks like "<b>126.0</b><br>(22-1988)" or "126.0<br>(22-1988)"

        // Remove tags for regex
        const cleanContent = cellContent.replace(/<[^>]*>/g, ' ').trim();

        // Extract number
        const matchNum = cleanContent.match(/([\d\.]+)/);
        if (matchNum) {
            windVals[i] = parseFloat(matchNum[1]);
        }

        // Extract date
        // Date often in parens (DD-YYYY) or (YYYY)
        const matchDate = cleanContent.match(/\((.*?)\)/);
        if (matchDate) {
            windDates[i] = matchDate[1];
        } else {
            // Try finding year at end
            const yearMatch = cleanContent.match(/\d{4}/);
            if (yearMatch) windDates[i] = yearMatch[0];
        }

        cursor = contentEnd + 5;
    }

    // Meteociel order is year last?
    // Actually usually it's JAN...DEC then Year or Season.
    // The page columns are: Month columns then Année.
    // Let's assume standard 12 months + Year.

    return { vals: windVals, dates: windDates };
}

async function run() {
    console.log(`Fetching ${URL}...`);
    try {
        const html = await fetchPage(URL);
        const windData = parseMeteociel(html);

        if (windData) {
            console.log("Extracted Data:", JSON.stringify(windData, null, 2));

            // Update JSON
            let recordsData = {};
            try {
                recordsData = JSON.parse(fs.readFileSync('src/data/all_stations_records.json', 'utf8'));
            } catch (e) { }

            if (!recordsData[STATION_ID]) recordsData[STATION_ID] = { records: {} };
            if (!recordsData[STATION_ID].records) recordsData[STATION_ID].records = {};

            recordsData[STATION_ID].records.maxWind = windData;

            fs.writeFileSync('src/data/all_stations_records.json', JSON.stringify(recordsData, null, 2));
            console.log("✅ Saved to all_stations_records.json");
        } else {
            console.log("❌ Failed to parse data");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
