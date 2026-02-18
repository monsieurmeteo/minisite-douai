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

async function fetchVigilance() {
    console.log("🌦️ Récupération de la Vigilance J et J+1...");

    try {
        const response = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", {
            headers: {
                "apikey": token,
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const data = await response.json();

        let allUpsertData = [];

        // On traite les deux périodes (J et J+1)
        data.product.periods.forEach((period, periodIdx) => {
            if (!period.timelaps || !period.timelaps.domain_ids) return;

            const domains = period.timelaps.domain_ids;
            const upsertData = domains.map(domain => {
                return {
                    dep_code: domain.domain_id,
                    period: periodIdx,
                    level: domain.max_color_id,
                    risks: domain.phenomenon_items.map(p => ({
                        id: p.phenomenon_id,
                        level: p.phenomenon_max_color_id
                    })),
                    last_update: new Date().toISOString()
                };
            });
            allUpsertData.push(...upsertData);
        });

        const { error } = await supabase
            .from('vigilance_status')
            .upsert(allUpsertData);

        if (error) throw error;

        console.log(`✅ Vigilance mise à jour pour ${allUpsertData.length} entrées (J et J+1).`);

    } catch (err) {
        console.error("❌ Erreur collecte vigilance:", err.message);
    }
}

fetchVigilance();
