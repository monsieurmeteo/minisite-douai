import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chargement manuel de l'environnement
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Clés Supabase manquantes dans .env.local");
    process.exit(1);
}

const supabase = createClient(
    urlMatch[1].trim(),
    keyMatch[1].trim()
);

// Configuration
const START_DATE = '2015-01-01';
const END_DATE = '2021-05-01'; // Période affectée par la suppression
const BATCH_SIZE = 5; // Récupération par lots de 5 jours

function getDatesRange(start, end) {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        dates.push({
            str: current.toISOString().split('T')[0], // YYYY-MM-DD
            agate: current.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
        });
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

async function fetchDate(dateObj) {
    try {
        const url = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateObj.agate}&heureD=00&heureF=23&pass=jh2kH3,R`;
        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            const strikes = data.map(s => ({
                strike_time: `${s.date.replace(/\//g, '-')}T${s.heure}+01:00`,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon)
            }));

            const { error } = await supabase
                .from('lightning_strikes')
                .upsert(strikes, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });

            if (error) throw error;
            return { date: dateObj.str, count: strikes.length, status: '✅' };
        }
        return { date: dateObj.str, count: 0, status: '⚪' };
    } catch (e) {
        return { date: dateObj.str, error: e.message, status: '❌' };
    }
}

async function restoreData() {
    console.log("🔄 RESTAURATION DES DONNÉES FOUDRE (AGATE -> SUPABASE)\n");
    console.log(`📅 Période : ${START_DATE} à ${END_DATE}`);
    console.log("=".repeat(60));

    const dates = getDatesRange(START_DATE, END_DATE);
    let totalRestored = 0;

    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(d => fetchDate(d)));

        results.forEach(r => {
            if (r.status === '✅') {
                totalRestored += r.count;
                console.log(`${r.status} ${r.date} : ${r.count} impacts restaurés`);
            } else if (r.status === '❌') {
                console.error(`${r.status} ${r.date} : Erreur - ${r.error}`);
            }
        });

        // Petit délai pour ne pas spammer l'API Agate
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 Restauration terminée ! Total impacts : ${totalRestored.toLocaleString()}`);
}

restoreData();
