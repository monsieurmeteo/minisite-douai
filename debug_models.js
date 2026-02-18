
const https = require('https');

const models = [
    'arome_france',
    'meteofrance_arpege_europe',
    'icon_eu',
    'ecmwf_ifs025',
    'gfs_global',
    'gem_global'
];

const params = new URLSearchParams({
    latitude: 50.3667,
    longitude: 3.0667,
    hourly: 'temperature_2m,precipitation',
    models: models.join(','),
    timezone: 'Europe/Paris',
    forecast_days: 1
});

const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

console.log("Fetching:", url);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json);
            } else {
                console.log("Keys in hourly:", Object.keys(json.hourly));

                // Check sample values
                const firstKey = Object.keys(json.hourly)[0]; // e.g. time
                console.log(`Sample ${firstKey}:`, json.hourly[firstKey].slice(0, 3));

                const tempKey = 'temperature_2m_arome_france';
                if (json.hourly[tempKey]) {
                    console.log(`Sample ${tempKey}:`, json.hourly[tempKey].slice(0, 3));
                } else {
                    console.error(`MISSING KEY: ${tempKey}`);
                }
            }
        } catch (e) {
            console.error("Parse error", e);
        }
    });
}).on("error", (err) => {
    console.error("Network error", err);
});
