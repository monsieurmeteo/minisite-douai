import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const token = envContent.match(/VITE_METEO_VIGILANCE_TOKEN=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function fetchAdvancedVigilance() {
    console.log("🚀 Lancement de la collecte Vigilance Avancée...");

    try {
        // 1. Fetch Carte
        const mapRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const mapData = await mapRes.json();

        // 2. Fetch Bulletins
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: { "apikey": token, "Accept": "application/json" }
        });
        const textData = await textRes.json();

        // --- Process Maps ---
        let allUpsertData = [];
        mapData.product.periods.forEach((period, periodIdx) => {
            if (!period.timelaps || !period.timelaps.domain_ids) return;
            const domains = period.timelaps.domain_ids;
            const upsertData = domains.map(domain => ({
                dep_code: domain.domain_id,
                period: periodIdx,
                level: domain.max_color_id,
                start_time: period.begin_validity_time,
                end_time: period.end_validity_time,
                risks: domain.phenomenon_items.map(p => ({
                    id: p.phenomenon_id,
                    level: p.phenomenon_max_color_id,
                    timelines: p.timelaps_items // Include the detailed start/end times per color
                })),
                last_update: new Date().toISOString()
            }));
            allUpsertData.push(...upsertData);
        });

        await supabase.from('vigilance_status').upsert(allUpsertData);

        // --- Process Bulletins avec la structure correcte text_bloc_items ---
        let bulletins = [];
        if (textData.product && textData.product.text_bloc_items) {
            textData.product.text_bloc_items.forEach(bloc => {
                const domainId = bloc.domain_id === 'FRA' ? 'france' : bloc.domain_id;

                if (bloc.bloc_items) {
                    bloc.bloc_items.forEach(item => {
                        const contentParts = [];

                        if (item.text_items) {
                            item.text_items.forEach(ti => {
                                const extractFromObj = (obj) => {
                                    if (!obj) return;
                                    if (obj.bold_text) contentParts.push(`**${obj.bold_text}**`);
                                    if (Array.isArray(obj.text)) {
                                        obj.text.forEach(t => contentParts.push(t));
                                    }
                                    if (Array.isArray(obj.subdivision_text)) {
                                        obj.subdivision_text.forEach(st => {
                                            if (typeof st === 'string') contentParts.push(st);
                                            else extractFromObj(st);
                                        });
                                    }
                                };

                                extractFromObj(ti);

                                if (Array.isArray(ti.term_items)) {
                                    ti.term_items.forEach(term => extractFromObj(term));
                                }

                                contentParts.push(""); // Spacer
                            });
                        }

                        bulletins.push({
                            domain_id: domainId,
                            text_type: item.id,
                            title: item.title || item.type_name || 'Bulletin Vigilance',
                            content: contentParts.join('\n').trim(),
                            update_time: textData.product.update_time
                        });
                    });
                }
            });
        }

        if (bulletins.length > 0) {
            // Deduplicate to avoid unique constraint violations
            const uniqueBulletins = Array.from(new Map(bulletins.map(b => [`${b.domain_id}_${b.text_type}`, b])).values());
            const { error: errTxt } = await supabase.from('vigilance_bulletins').upsert(uniqueBulletins, { onConflict: 'domain_id,text_type' });
            if (errTxt) throw errTxt;
        }

        console.log(`✅ Collecte terminée : ${allUpsertData.length} zones et ${bulletins.length} bulletins traités.`);

    } catch (err) {
        console.error("❌ Erreur:", err.message);
    }
}

fetchAdvancedVigilance();
