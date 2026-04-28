import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function fetchMeteocielHTML(stationId, date) {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const m_url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;
    try {
        const response = await fetch(m_url);
        const buffer = await response.arrayBuffer();
        return new TextDecoder('windows-1252').decode(buffer);
    } catch (e) { return null; }
}

function parseMeteociel(html) {
    const observations = [];
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+h\d*)<\/td>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
        const timeStr = match[1];
        const cellsHtml = match[2];
        const cells = cellsHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length < 4) continue;

        const parts = timeStr.split('h');
        const hour = parseInt(parts[0]);
        const minute = parseInt(parts[1]) || 0;
        const getVal = (idx) => {
            if (!cells[idx]) return null;
            const txt = cells[idx].replace(/<[^>]*>/g, '').trim();
            if (!txt || txt === '&nbsp;' || txt === '\u00A0' || txt === '-') return null;
            const val = parseFloat(txt.replace(/[^\d.-]/g, '').replace(',', '.'));
            return isNaN(val) ? null : val;
        };

        const rainTxt = cells[9] ? cells[9].toLowerCase() : '';
        let rr = getVal(9);
        if (rainTxt.includes('aucune')) rr = 0;

        observations.push({ hour, minute, t: getVal(2), u: getVal(3), td: getVal(4), ff: getVal(7), fxi: getVal(8), pres: getVal(9), rr });
    }
    return observations;
}

// Wait, the column indices might be shifting. Better use the "Heure" row to find them or hardcode correctly.
// Based on my previous `Headers` check (step 976):
// 0 Heurelocale
// 1 Visi
// 2 Température
// 3 Humi.
// 4 Point de rosée
// 5 Vent (rafales) - Wait, this is sometimes joined?
// 6 Pression
// 7 Précip. 6min
// Let's check step 976 again:
// 0 Heurelocale
// 1 Visi
// 2 Température
// 3 Humi.
// 4 Point de rosée
// 5 Vent
// 6 Raffales (sometimes)
// 7 ... 
// Actually, it varies. Let's just use the column containing "Précip" to find it.

async function fillGapsForDay(stationId, dateStr) {
    const date = new Date(dateStr);
    const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date); end.setUTCHours(23, 54, 0, 0);

    const { data: existing } = await supabase.from('observations_6mn').select('timestamp').eq('station_id', stationId).gte('timestamp', start.toISOString()).lte('timestamp', end.toISOString());
    const exSet = new Set(existing?.map(e => new Date(e.timestamp).toISOString()));
    const missing = [];
    let cur = new Date(start);
    while (cur <= end) { if (!exSet.has(cur.toISOString())) missing.push(cur.toISOString()); cur.setMinutes(cur.getMinutes() + 1); } // Checking every minute since it might vary

    // Simplified: just refill everything if count < expected
    // if(existing.length >= 240) return console.log(`${dateStr}: ✅ Coverage OK.`);

    const html = await fetchMeteocielHTML(stationId, dateStr);
    if (!html) return;

    // Find precip column
    const headerMatch = html.match(/<tr bgcolor=#CCDDFF>([\s\S]*?)<\/tr>/i);
    let rainIdx = -1;
    if (headerMatch) {
        const hs = headerMatch[1].match(/<td[^>]*>(.*?)<\/td>/gi);
        hs.forEach((h, i) => { if (h.includes('Précip')) rainIdx = i; });
    }
    if (rainIdx === -1) rainIdx = 9; // Fallback

    const observations = [];
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+h\d*)<\/td>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
        const timeStr = match[1];
        const cells = match[2].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length < 4) continue;
        const [h, m] = timeStr.split('h').map(v => parseInt(v) || 0);

        const getV = (idx) => {
            const txt = (cells[idx] || '').replace(/<[^>]*>/g, '').trim().replace(/&nbsp;/g, '');
            if (!txt || txt === '-') return null;
            const v = parseFloat(txt.replace(',', '.').replace(/[^\d.-]/g, ''));
            return isNaN(v) ? null : v;
        };

        const rainTxt = (cells[rainIdx] || '').toLowerCase();
        let rr = getV(rainIdx);
        if (rainTxt.includes('aucune')) rr = 0;

        // This is 6-min rain usually.
        observations.push({ hour: h, minute: m, t: getV(2), rr });
    }

    const toInsert = [];
    for (const obs of observations) {
        // Construct UTC timestamp from local time (CET)
        const dateObj = new Date(dateStr);
        let utcTs = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), obs.hour - 1, obs.minute));

        toInsert.push({
            station_id: stationId,
            timestamp: utcTs.toISOString(),
            t: obs.t,
            rr_per: obs.rr
        });
    }

    if (toInsert.length > 0) {
        const { error } = await supabase.from('observations_6mn').upsert(toInsert, { onConflict: 'station_id, timestamp' });
        if (error) console.error(error);
        console.log(`${dateStr}: Inserted ${toInsert.length} points.`);
    }
}

async function run() {
    const chauny = '02173002';
    for (let d = 1; d <= 28; d++) {
        const dStr = `2026-02-${String(d).padStart(2, '0')}`;
        await fillGapsForDay(chauny, dStr);
    }
    console.log("Done.");
}
run();
