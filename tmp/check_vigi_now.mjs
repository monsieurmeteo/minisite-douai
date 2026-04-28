import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Checking Supabase Vigilance Data ---');
    const { data, error } = await supabase
        .from('vigilance_status')
        .select('dep_code, period, start_time, end_time, last_update')
        .eq('period', 1)
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(data);
    }

    console.log('\n--- Checking MF API directly ---');
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
        
        console.log('MF API Update Time:', mapData.product.update_time);
        
        if (mapData.product.periods && mapData.product.periods[1]) {
            console.log('Period 1 Start:', mapData.product.periods[1].begin_validity_time);
            console.log('Period 1 End:', mapData.product.periods[1].end_validity_time);
        } else {
            console.log('Period 1 not found in MF API response!');
        }
    } catch (e) {
        console.error('MF API Error:', e.message);
    }
}

check();
