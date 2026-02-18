
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function syncToday() {
    try {
        const now = new Date();
        // Force yesterday to have some "history"
        now.setDate(now.getDate() - 1);
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;
        const dateISO = `${yyyy}-${mm}-${dd}`;

        console.log(`Manual Sync for ${dateISO}...`);
        const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;

        const response = await fetch(agateUrl);
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Invalid data format from Agate", data);
            return;
        }

        console.log(`Found ${data.length} impacts.`);

        const strikesToInsert = data.map(s => ({
            strike_time: `${s.date.replace(/\//g, '-')}T${s.heure}+01:00`,
            lat: parseFloat(s.lat),
            lon: parseFloat(s.lon)
        }));

        const { error } = await supabase
            .from('lightning_strikes')
            .upsert(strikesToInsert, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });

        if (error) {
            console.error("Supabase error:", error.message);
        } else {
            console.log("Successfully synced history into Supabase!");
        }
    } catch (e) {
        console.error("Sync failed:", e.message);
    }
}

syncToday();
