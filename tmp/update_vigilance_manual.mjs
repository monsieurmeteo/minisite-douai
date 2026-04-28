import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

async function updateVigilance() {
    console.log('🚀 MANUALLY UPDATING VIGILANCE TABLES...');
    try {
        // 1. Get Token
        const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
        const resT = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await resT.json();

        const headers = { "Authorization": `Bearer ${access_token}` };

        // 2. Fetch Map
        const mapRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", { headers });
        const mapData = await mapRes.json();

        // 3. Process Map
        let allUpsertData = [];
        if (mapData && mapData.product && mapData.product.periods) {
            mapData.product.periods.forEach((period, periodIdx) => {
                const domains = period.timelaps.domain_ids;
                const upsertData = domains.map((domain) => ({
                    dep_code: domain.domain_id,
                    period: periodIdx,
                    level: domain.max_color_id,
                    start_time: period.begin_validity_time,
                    end_time: period.end_validity_time,
                    risks: domain.phenomenon_items?.map((p) => ({
                        id: p.phenomenon_id,
                        level: p.phenomenon_max_color_id,
                        timelines: p.timelaps_items
                    })) || [],
                    last_update: new Date().toISOString()
                }));
                allUpsertData.push(...upsertData);
            });
        }

        if (allUpsertData.length > 0) {
            const { error } = await supabase.from('vigilance_status').upsert(allUpsertData, { onConflict: 'dep_code, period' });
            if (error) console.error("Error Status:", error.message);
            else console.log(`✅ Status updated: ${allUpsertData.length} records.`);
        }

        // 4. Fetch Bulletins
        const bullRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", { headers });
        if (bullRes.ok) {
            const bullData = await bullRes.json();
            let bulletins = [];
            if (bullData.product && bullData.product.text_bloc_items) {
                bullData.product.text_bloc_items.forEach((bloc) => {
                    const domainId = bloc.domain_id === 'FRA' ? 'france' : bloc.domain_id;
                    if (bloc.bloc_items) {
                        bloc.bloc_items.forEach((item) => {
                            bulletins.push({
                                domain_id: domainId,
                                text_type: item.id,
                                title: item.title || item.type_name || 'Bulletin Vigilance',
                                content: "Bulletin actualisé par script manuel.",
                                update_time: bullData.product.update_time
                            });
                        });
                    }
                });
            }
            if (bulletins.length > 0) {
                await supabase.from('vigilance_bulletins').upsert(bulletins, { onConflict: 'domain_id, text_type' });
                console.log(`✅ Bulletins updated: ${bulletins.length} records.`);
            }
        }

        console.log('✨ VIGILANCE UPDATE COMPLETE');

    } catch (e) {
        console.error("Fatal Error:", e.message);
    }
}

updateVigilance();
