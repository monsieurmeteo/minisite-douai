import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function importDay(dateStr) {
    const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;
    try {
        const res = await fetch(agateUrl);
        const text = await res.text(); // Parse text first to debug if needed
        let data;
        try { data = JSON.parse(text); } catch (e) { return 0; }

        if (!Array.isArray(data) || data.length === 0) return 0;

        const rows = data.map(s => ({
            strike_time: `${s.date.replace(/\//g, '-')}T${s.heure}+01:00`,
            lat: parseFloat(s.lat),
            lon: parseFloat(s.lon)
        }));

        const CHUNK = 3000;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const { error } = await supabase.from('lightning_strikes').upsert(chunk, {
                onConflict: 'strike_time,lat,lon',
                ignoreDuplicates: true
            });
            if (error) console.error(` [!] Error ${dateStr}:`, error.message);
            else inserted += chunk.length;
        }
        return inserted;
    } catch (e) {
        return 0;
    }
}

async function importYear(year) {
    console.log(`\n--- 🌩️  ASPIRATION ANNÉE ${year} ---`);
    let totalYear = 0;

    // On boucle sur les mois de décembre à janvier
    for (let m = 12; m >= 1; m--) {
        let totalMonth = 0;
        const daysInMonth = new Date(year, m, 0).getDate();

        process.stdout.write(`Mois ${m}/${year}: `);
        for (let d = daysInMonth; d >= 1; d--) {
            const ds = `${year}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
            const count = await importDay(ds);
            totalMonth += count;
            if (count > 0) process.stdout.write('.');
        }
        totalYear += totalMonth;
        console.log(` OK (${totalMonth} impacts)`);
    }
    console.log(`✅ TOTAL ${year} : ${totalYear} impacts importés.`);
}

async function run() {
    console.log("🚀 Démarrage de l'aspirateur historique (2024 -> 2015)");

    // On peut changer la liste des années ici
    const yearsToImport = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

    for (const year of yearsToImport) {
        await importYear(year);
        // Petite pause entre les années pour soulager le serveur
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("\n🎊 TOUTES LES ARCHIVES ONT ÉTÉ TRAITÉES !");
}

run();
