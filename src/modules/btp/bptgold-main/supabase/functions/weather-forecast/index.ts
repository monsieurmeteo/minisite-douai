import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geocoding API to convert French postal codes/commune names to coordinates
async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    // Open-Meteo geocoding API
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr&format=json`;
    console.log(`Geocoding request: ${geocodeUrl}`);
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Filter for French results
      const frenchResult = data.results.find((r: any) => r.country_code === 'FR');
      const result = frenchResult || data.results[0];
      
      console.log(`Found location: ${result.name}, ${result.admin1 || ''}, ${result.country}`);
      return {
        lat: result.latitude,
        lon: result.longitude,
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}`
      };
    }
    
    // Try with French postal code API
    if (/^\d{5}$/.test(query.trim())) {
      const postalUrl = `https://geo.api.gouv.fr/communes?codePostal=${query.trim()}&fields=nom,centre&format=json`;
      console.log(`Postal code lookup: ${postalUrl}`);
      
      const postalResponse = await fetch(postalUrl);
      const postalData = await postalResponse.json();
      
      if (postalData && postalData.length > 0) {
        const commune = postalData[0];
        console.log(`Found commune: ${commune.nom}`);
        return {
          lat: commune.centre.coordinates[1],
          lon: commune.centre.coordinates[0],
          name: commune.nom
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Fetch weather forecast from Open-Meteo
async function fetchWeatherForecast(lat: number, lon: number, days: number = 14) {
  // Open-Meteo provides up to 16 days forecast
  const forecastDays = Math.min(days, 16);
  
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m&timezone=Europe/Paris&forecast_days=${forecastDays}`;
  
  console.log(`Weather request: ${weatherUrl}`);
  
  const response = await fetch(weatherUrl);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.reason || 'Weather API error');
  }
  
  return data;
}

// Process weather data into daily format with hourly details (0h-23h)
function processWeatherData(data: any) {
  const hourly = data.hourly;
  const dailyData: any = {};
  
  for (let i = 0; i < hourly.time.length; i++) {
    const datetime = new Date(hourly.time[i]);
    const dateKey = datetime.toISOString().split('T')[0];
    const hour = datetime.getHours();
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        formattedDate: datetime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        hours: []
      };
    }
    
    dailyData[dateKey].hours.push({
      hour: hour,
      temp: hourly.temperature_2m[i],
      humidity: hourly.relative_humidity_2m[i],
      precipitation: hourly.precipitation[i] || 0,
      rain: hourly.rain[i] || 0,
      snow: hourly.snowfall[i] || 0,
      windSpeed: hourly.wind_speed_10m[i],
      windGusts: hourly.wind_gusts_10m[i]
    });
  }
  
  // Ensure each day has all 24 hours (0-23) sorted properly
  Object.values(dailyData).forEach((day: any) => {
    // Sort hours by hour number
    day.hours.sort((a: any, b: any) => a.hour - b.hour);
    
    // Fill missing hours if any (interpolate or use previous value)
    const existingHours = new Set(day.hours.map((h: any) => h.hour));
    for (let h = 0; h <= 23; h++) {
      if (!existingHours.has(h)) {
        // Find nearest hour data to interpolate
        const nearestHour = day.hours.reduce((prev: any, curr: any) => {
          return Math.abs(curr.hour - h) < Math.abs(prev.hour - h) ? curr : prev;
        }, day.hours[0]);
        
        day.hours.push({
          hour: h,
          temp: nearestHour.temp,
          humidity: nearestHour.humidity,
          precipitation: 0,
          rain: 0,
          snow: 0,
          windSpeed: nearestHour.windSpeed,
          windGusts: nearestHour.windGusts
        });
      }
    }
    // Re-sort after adding missing hours
    day.hours.sort((a: any, b: any) => a.hour - b.hour);
  });
  
  // Calculate daily summaries
  const result = Object.values(dailyData).map((day: any) => {
    const temps = day.hours.map((h: any) => h.temp);
    const humidities = day.hours.map((h: any) => h.humidity);
    const precipitations = day.hours.map((h: any) => h.precipitation);
    const winds = day.hours.map((h: any) => h.windSpeed);
    const gusts = day.hours.map((h: any) => h.windGusts);
    
    return {
      ...day,
      summary: {
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        tempAvg: temps.reduce((a: number, b: number) => a + b, 0) / temps.length,
        humidityMin: Math.min(...humidities),
        humidityMax: Math.max(...humidities),
        humidityAvg: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length,
        precipitationTotal: precipitations.reduce((a: number, b: number) => a + b, 0),
        windMax: Math.max(...winds),
        windAvg: winds.reduce((a: number, b: number) => a + b, 0) / winds.length,
        gustsMax: Math.max(...gusts)
      }
    };
  });
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, days = 14, action = 'forecast' } = await req.json();
    
    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location is required (postal code or commune name)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Action: ${action}, Location: ${location}, days: ${days}`);

    // Step 1: Geocode the location
    const coords = await geocodeLocation(location);
    
    if (!coords) {
      return new Response(
        JSON.stringify({ error: `Lieu non trouvé: ${location}. Essayez avec un code postal ou un nom de commune français.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is 'search', just return the location info without weather data
    if (action === 'search') {
      console.log(`Search result: ${coords.name} (${coords.lat}, ${coords.lon})`);
      return new Response(
        JSON.stringify({
          location: coords.name,
          coordinates: { lat: coords.lat, lon: coords.lon }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch weather forecast
    const weatherData = await fetchWeatherForecast(coords.lat, coords.lon, days);
    
    // Step 3: Process data
    const processedData = processWeatherData(weatherData);

    console.log(`Successfully fetched ${processedData.length} days of forecast for ${coords.name}`);

    return new Response(
      JSON.stringify({
        location: coords.name,
        coordinates: { lat: coords.lat, lon: coords.lon },
        days: processedData.length,
        forecast: processedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Weather forecast error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather forecast';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
