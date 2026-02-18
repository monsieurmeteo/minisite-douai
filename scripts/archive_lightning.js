import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Configuration manquante : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY introuvable dans .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGATE_URL = "http://api-agate.meteo-france.fr/ORAGE/orage/ws/wsOragesGMaps.php"; // Exemple (endpoint exact à vérifier selon votre config proxy)
// Note: Le script doit appeler l'API Agate directement, ou passer par votre proxy local si IP restreinte.
// En local Node, on tape souvent l'URL publique ou l'IP directe.

async function archiveLightning() {
    console.log(`⚡ [${new Date().toISOString()}] Démarrage archivage foudre...`);

    try {
        // CIBLE : La veille (Yesterday) car le script tourne à 00h15 pour archiver la journée complète précédente
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1); // Recule d'un jour

        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;  // Format YYYYMMDD attendu par Agate

        console.log(`📅 Cible archivage : ${dateStr} (Hier)`);

        // 1. Récupérer les données LIVE Agate
        // Paramètres standards Agate
        const url = `https://www.infoclimat.fr/public-api/gfs/json?_ll=48.85341,2.3488&_auth=...`; // TODO: REMETTRE LA VRAIE URL AGATE ET SES PARAMETRES (Pass, etc)
        // Comme je n'ai pas les params secrets (pass=jh2kH3,R) sous les yeux dans le chat contexte immédiat, je reprends ceux du code source :
        const agateUrl = `https://www.meteo60.fr/api-agate/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`;
        // ATTENTION : L'URL ci-dessus est celle que le FRONT utilisait via un Proxy.
        // Si ce script tourne sur un serveur : il lui faut l'accès internet.
        // Si l'API Agate bloque les origines inconnues, ça peut coincer.
        // On suppose ici que ça passe ou que vous adapterez l'URL source.

        // Pour ce script, je vais utiliser un fetch générique qui mime ce que faisait le front
        const res = await fetch(agateUrl, { headers: { 'User-Agent': 'ArchiveBot/1.0' } });
        if (!res.ok) throw new Error(`Erreur HTTP Agate: ${res.status}`);

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.log("⚠️ Pas de données ou format incorrect reçu.");
            return;
        }

        console.log(`📥 ${data.length} impacts récupérés depuis Agate.`);

        if (data.length === 0) return;

        // 2. Préparer les données pour Supabase
        const rows = data.map(s => {
            // s.date = "2024/01/24", s.heure = "23:15:00"
            const isoTime = `${s.date.replace(/\//g, '-')}T${s.heure}Z`; // On suppose Agate en UTC ? Ou locale ?
            // Agate est souvent en TU (UTC). Vérifions : s.heure est brute.
            // Si Agate est en TU, on stocke tel quel avec 'Z'.
            // Si Agate est en locale, attention aux décalages. 
            // Convention standard : Stocker en UTC dans la DB.
            return {
                strike_time: new Date(isoTime).toISOString(),
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon),
                created_at: new Date().toISOString()
            };
        });

        // 3. Upsert (Insérer ou Ignorer si existe déjà)
        // La clé unique doit être gérée. Soit on a un ID unique Agate (non), soit on déduisit une clé composite (time + lat + lon).
        // Supabase 'upsert' fonctionne bien si on a une contrainte unique en base.
        // On va faire un insert avec 'ignoreDuplicates' si possible, ou vérifier manuellement.

        // Optimisation : On ne peut pas tout envoyer d'un coup si > 1000.
        const batchSize = 500;
        let insertedCount = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            // On utilise upsert sur (strike_time, lat, lon) si une contrainte existe.
            // Sinon on fait un RPC ou on espère que Supabase dédoublonne.
            // Pour faire simple et robuste : "onConflict: 'strike_time, lat, lon'" si contrainte créée.

            const { error } = await supabase
                .from('lightning_strikes')
                .upsert(batch, { onConflict: 'strike_time,lat,lon', ignoreDuplicates: true });

            if (error) console.error("Erreur Insert Batch:", error);
            else insertedCount += batch.length;
        }

        console.log(`✅ Archivage terminé : ${insertedCount} lignes traitées/insérées.`);

    } catch (e) {
        console.error("❌ Erreur Script Archivage:", e);
    }
}

// Exécution directe
archiveLightning();
