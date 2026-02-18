
const fetch = require('node-fetch'); // Assuming node environment might not have fetch by default unless Node 18+
// If node-fetch is not available, we use standard https.
// Actually, let's assume Node 18+ or just use a simple https get.

const https = require('https');

const models = [
    'ecmwf_ifs04',
    'meteofrance_arome_france',
    'meteofrance_arpege_europe',
    'gfs_global',
    'icon_global',
    'gem_global'
];

const params = new URLSearchParams({
    latitude: 50.3667,
    longitude: 3.0667,
    hourly: 'temperature_2m,precipitation',
    models: models.join(','),
    timezone: 'Europe/Paris',
    forecast_days: 2
});

const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

console.log("Fetching URL:", url);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json);
            } else if (Array.isArray(json)) {
                console.log("Success! Received array of length:", json.length);
                console.log("Keys of first item:", Object.keys(json[0]));
                // Check if hourly exists
                if (json[0].hourly) {
                    console.log("First item has hourly data.");
                } else {
                    console.log("First item MISSING hourly data:", json[0]);
                }
            } else {
                console.log("Received Object instead of Array:", Object.keys(json));
            }
        } catch (e) {
            console.error("Parse Error", e);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
