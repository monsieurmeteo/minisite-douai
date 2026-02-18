import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    try {
        // 1. Calcul de la date du jour (YYYYMMDD) pour Agate
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        // 2. Récupération des données chez Agate
        const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;

        console.log(`Collecte foudre Agate pour le ${dateStr}...`);
        const response = await fetch(agateUrl);
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Format de données Agate invalide");
        }

        console.log(`${data.length} impacts trouvés chez Agate.`);

        // 3. Préparation des données pour Supabase
        const strikesToInsert = data.map(s => {
            const formattedDate = s.date.replace(/\//g, '-');
            // Agate fournit l'heure locale française (ex: 13:25:00).
            // On ajoute explicitement l'offset +01:00 (hiver) pour que Supabase sache que c'est l'heure française.
            const timestamp = `${formattedDate}T${s.heure}+01:00`;
            return {
                strike_time: timestamp,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon)
            };
        });

        // 4. Insertion massive avec gestion des doublons (ON CONFLICT DO NOTHING)
        // Nous utilisons des paquets de 1000 pour éviter de saturer Supabase
        const CHUNK_SIZE = 1000;
        let insertedCount = 0;

        for (let i = 0; i < strikesToInsert.length; i += CHUNK_SIZE) {
            const chunk = strikesToInsert.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('lightning_strikes')
                .upsert(chunk, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });

            if (error) console.error("Erreur d'insertion chunk:", error.message);
            else insertedCount += chunk.length;
        }

        return new Response(JSON.stringify({
            success: true,
            total_agate: data.length,
            processed: insertedCount,
            message: "Synchronisation réussie"
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Erreur robot foudre:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
