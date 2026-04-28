import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Checking MF API directly ---');
    const METEO_KEY = 'Mhar9YSs8LEluq4neXqP0YeHaaka';
    const METEO_SECRET = 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';
    
    try {
        const auth = Buffer.from(`${METEO_KEY}:${METEO_SECRET}`).toString('base64');
        const resT = await fetch('https://portail-api.meteofrance.fr/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await resT.json();
        const headers = { "Authorization": `Bearer ${access_token}` };

        const mapRes = await fetch("https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours", { headers });
        const mapData = await mapRes.json();
        
        console.log('MF_UPDATE_TIME:', mapData.product.update_time);
        
        if (mapData.product.periods && mapData.product.periods[1]) {
            console.log('PERIOD_1_RANGE:', mapData.product.periods[1].begin_validity_time, 'to', mapData.product.periods[1].end_validity_time);
        }

        const { data } = await supabase
            .from('vigilance_status')
            .select('last_update')
            .limit(1);
        console.log('DB_LAST_UPDATE:', data?.[0]?.last_update);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
