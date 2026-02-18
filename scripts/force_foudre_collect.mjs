import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI'
);

async function runCollection() {
    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;
        console.log(`Fetching from Agate for date ${dateStr}...`);

        const response = await fetch(agateUrl);
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Invalid data format from Agate", data);
            return;
        }

        console.log(`Found ${data.length} strikes today.`);

        const strikesToInsert = data.map(s => {
            const formattedDate = s.date.replace(/\//g, '-');
            // Store as local time string for the DB (which interprets it correctly with offset)
            const timestamp = `${formattedDate}T${s.heure}+01:00`;
            return {
                strike_time: timestamp,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon)
            };
        });

        console.log("Inserting into Supabase (Public Table lightning_strikes)...");
        // Use upsert to avoid duplicates
        const { error } = await supabase
            .from('lightning_strikes')
            .upsert(strikesToInsert, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log(`Successfully populated database with ${strikesToInsert.length} strikes!`);
        }

        // Also check yesterday to have some history
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const y_yyyy = yesterday.getFullYear();
        const y_mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yesterday.getDate()).padStart(2, '0');
        const y_dateStr = `${y_yyyy}${y_mm}${y_dd}`;

        console.log(`\nFetching for yesterday ${y_dateStr}...`);
        const y_response = await fetch(`https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${y_dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`);
        const y_data = await y_response.json();

        if (Array.isArray(y_data) && y_data.length > 0) {
            const y_strikes = y_data.map(s => ({
                strike_time: `${s.date.replace(/\//g, '-')}T${s.heure}+01:00`,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon)
            }));
            await supabase.from('lightning_strikes').upsert(y_strikes, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });
            console.log(`Added ${y_data.length} strikes for yesterday.`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

runCollection();
