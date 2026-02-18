import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (req) => {
    try {
        console.log("📡 Capture des timestamps Radar...");

        // 1. Récupérer les données RainViewer
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();

        if (!data.radar || !data.radar.past) {
            throw new Error("Données radar non disponibles");
        }

        // 2. Extraire les timestamps
        const timestamps = data.radar.past.map((item: any) => ({
            ts_value: item.time
        }));

        console.log(`🔎 ${timestamps.length} timestamps trouvés.`);

        // 3. Sauvegarder en DB (Upsert pour ignorer les doublons)
        const { error } = await supabase
            .from('radar_history')
            .upsert(timestamps, { onConflict: 'ts_value' });

        if (error) throw error;

        return new Response(JSON.stringify({
            success: true,
            captured: timestamps.length
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Radar Archive Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
