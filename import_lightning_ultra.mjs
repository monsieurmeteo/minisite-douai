import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

function getOffset(dateStr) {
    const y = parseInt(dateStr.substring(0, 4));
    const m = parseInt(dateStr.substring(4, 6));
    const d = parseInt(dateStr.substring(6, 8));
    const date = new Date(y, m - 1, d);
    // Règle simplifiée France : Heure d'été du dernier dimanche de mars au dernier dimanche d'octobre
    // On peut aussi utiliser une approximation robuste : Avril à Septembre = +02:00
    if (m > 3 && m < 11) return "+02:00";
    if (m === 3 && d > 24) return "+02:00";
    if (m === 11 && d < 1) return "+02:00";
    return "+01:00";
}

async function importDayUltra(dateStr) {
    const offset = getOffset(dateStr);
    let totalDay = 0;

    console.log(`\n🌩️ Journée ${dateStr} (Slices 1h)...`);

    for (let h = 0; h <= 23; h++) {
        const hh = String(h).padStart(2, '0');
        const url = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=${hh}&heureF=${hh}&pass=jh2kH3,R`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) continue;

            const rows = data.map(strike => ({
                strike_time: `${strike.date.replace(/\//g, '-')}T${strike.heure}${offset}`,
                lat: parseFloat(strike.lat),
                lon: parseFloat(strike.lon)
            }));

            for (let i = 0; i < rows.length; i += 4000) {
                const chunk = rows.slice(i, i + 4000);
                await supabase.from('lightning_strikes').upsert(chunk, {
                    onConflict: 'strike_time,lat,lon',
                    ignoreDuplicates: true
                });
            }
            totalDay += rows.length;
            process.stdout.write(`${hh}h(${rows.length}) `);
        } catch (e) { process.stdout.write(`!${hh}h `); }
    }
    return totalDay;
}

async function run() {
    console.log("🚀 Lancement Aspirateur ULTRA-PRÉCIS (2015-2026)");
    console.log("Méthode : Découpage horaire + Correction DST auto");

    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

    for (const year of years) {
        console.log(`\n--- ANNÉE ${year} ---`);
        for (let m = 12; m >= 1; m--) {
            const daysInMonth = new Date(year, m, 0).getDate();
            process.stdout.write(`Mois ${m}: `);
            for (let d = daysInMonth; d >= 1; d--) {
                const ds = `${year}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
                const count = await importDayUltra(ds);
                if (count > 0) process.stdout.write('.');
            }
            console.log(` OK`);
        }
    }
    console.log("\n🎊 ARCHIVAGE INTÉGRAL TERMINÉ !");
}

run();
