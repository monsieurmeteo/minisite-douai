import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL')!;
        const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
        const METEO_FRANCE_TOKEN = Deno.env.get('METEO_VIGILANCE_TOKEN')!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        console.log("🚀 Lancement de la collecte Vigilance Avancée...");

        const fetchHeaders = {
            "Accept": "application/json",
            "apikey": METEO_FRANCE_TOKEN
        };

        // 1. Fetch Carte
        const mapRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: fetchHeaders
        });
        if (!mapRes.ok) throw new Error(`MF API Map Error: ${mapRes.status}`);
        const mapData = await mapRes.json();
        console.log(`📊 Map Data Periods: ${mapData.product.periods.length}`);

        // 2. Fetch Bulletins
        let textData: any = { product: { text_bloc_items: [] } };
        const textRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/textesvigilance/encours", {
            headers: fetchHeaders
        });

        if (textRes.ok) {
            textData = await textRes.json();
        } else if (textRes.status === 404) {
            console.log("ℹ️ Aucun bulletin texte disponible (404 est normal ici).");
        } else {
            console.warn(`⚠️ Erreur non-bloquante lors du fetch des textes: ${textRes.status}`);
        }

        // --- Process Maps ---
        let allUpsertData = [];
        if (mapData && mapData.product && mapData.product.periods) {
            mapData.product.periods.forEach((period: any, periodIdx: number) => {
                if (!period.timelaps || !period.timelaps.domain_ids) return;
                console.log(`📍 Period ${periodIdx} [${period.begin_validity_time} -> ${period.end_validity_time}]: ${period.timelaps.domain_ids.length} domains`);
                const domains = period.timelaps.domain_ids;
                const upsertData = domains.map((domain: any) => ({
                    dep_code: domain.domain_id,
                    period: periodIdx,
                    level: domain.max_color_id,
                    start_time: period.begin_validity_time,
                    end_time: period.end_validity_time,
                    risks: domain.phenomenon_items?.map((p: any) => ({
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
            const { error: statusErr } = await supabase.from('vigilance_status').upsert(allUpsertData, { onConflict: 'dep_code, period' });
            if (statusErr) console.error("Error upserting status:", statusErr.message);
        }

        // --- Process Bulletins ---
        let bulletins = [];
        if (textData.product && textData.product.text_bloc_items) {
            textData.product.text_bloc_items.forEach((bloc: any) => {
                const domainId = bloc.domain_id === 'FRA' ? 'france' : bloc.domain_id;
                if (bloc.bloc_items) {
                    bloc.bloc_items.forEach((item: any) => {
                        const contentParts: string[] = [];
                        if (item.text_items) {
                            item.text_items.forEach((ti: any) => {
                                const extractFromObj = (obj: any) => {
                                    if (!obj) return;
                                    if (obj.bold_text) contentParts.push(`**${obj.bold_text}**`);
                                    if (Array.isArray(obj.text)) {
                                        obj.text.forEach((t: string) => contentParts.push(t));
                                    }
                                    if (Array.isArray(obj.subdivision_text)) {
                                        obj.subdivision_text.forEach((st: any) => {
                                            if (typeof st === 'string') contentParts.push(st);
                                            else extractFromObj(st);
                                        });
                                    }
                                };
                                extractFromObj(ti);
                                if (Array.isArray(ti.term_items)) {
                                    ti.term_items.forEach((term: any) => extractFromObj(term));
                                }
                                contentParts.push("");
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
            const { error: bullErr } = await supabase.from('vigilance_bulletins').upsert(bulletins, { onConflict: 'domain_id, text_type' });
            if (bullErr) console.error("Error upserting bulletins:", bullErr.message);
        }

        // --- Notification Alert ---
        // On récupère toutes les configurations de surveillance actives
        const { data: userConfigs } = await supabase.from('user_station_configs').select('*').eq('alert_vigilance_enabled', true);

        if (userConfigs && userConfigs.length > 0) {
            // Liste unique des départements à surveiller (les 2 premiers chiffres du zip_code)
            const deptsToWatch = [...new Set(userConfigs.map(c => c.zip_code?.substring(0, 2)))].filter(Boolean);

            for (const depCode of deptsToWatch) {
                const depStatus = allUpsertData.find(d => d.dep_code === depCode && d.period === 0);

                if (depStatus && depStatus.level >= 2) { // 2=Jaune, 3=Orange, 4=Rouge
                    const colorNames = { 2: 'JAUNE', 3: 'ORANGE', 4: 'ROUGE' };
                    const colorName = colorNames[depStatus.level] || 'INCONNUE';

                    // On envoie la notif à tous les utilisateurs qui surveillent ce département
                    const configsForDep = userConfigs.filter(c => c.zip_code?.startsWith(depCode));

                    for (const config of configsForDep) {
                        console.log(`Sending vigilance alert (${colorName}) to ${config.ntfy_topic} for ${config.city_name}`);
                        await fetch(`https://ntfy.sh/${config.ntfy_topic}`, {
                            method: 'POST',
                            body: `⚠️ VIGILANCE ${colorName} : Le département ${depCode} (${config.city_name}) est en alerte. Consultez votre site pour les détails.`,
                            headers: {
                                'Title': 'Vigilance Meteo-France',
                                'Priority': depStatus.level >= 3 ? 'urgent' : 'default',
                                'Tags': 'warning,triangular_flag_on_post'
                            }
                        });
                    }
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            status_updated: allUpsertData.length,
            bulletins_updated: bulletins.length
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Vigilance Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
