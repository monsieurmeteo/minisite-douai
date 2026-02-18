
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load env vars from .env.local
const envConfig = dotenv.parse(fs.readFileSync(path.resolve('.env.local')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

// NOTE: Pour ce test, il nous faut le SERVICE_ROLE_KEY pour chopper le token MF dans la table secrets.
// Si l'utilisateur n'a pas mis la service key dans .env.local, on va essayer de feinter ou demander à l'utilisateur de la mettre.
// Pour l'instant, supposons qu'on ne l'a pas, on va utiliser une route API du site si elle existe, sinon on est coincé.

// PLAN B : On demande au robot de faire le diag pour nous via un log précis.
// Mais pour un script local, il nous faut un token.

async function runDiag() {
    console.log("🔍 DIAGNOSTIC APPROFONDI : DONNÉES CLIMATO");
    console.log("-----------------------------------------");

    if (!supabaseUrl) {
        console.error("❌ Pas de VITE_SUPABASE_URL dans .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check DB content for Lille (59343001)
    console.log("1️⃣ Vérification Base de Données (Supabase)...");
    const { data: dbData, error } = await supabase
        .from('observations_horaire')
        .select('timestamp, t, rr1, insolh')
        .eq('station_id', '59343001') // Lille-Lesquin
        .order('timestamp', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Erreur DB:", error.message);
    } else if (dbData.length === 0) {
        console.warn("⚠️ Aucune donnée en base pour Lille (59343001).");
    } else {
        console.log("✅ Dernières données en base pour Lille :");
        dbData.forEach(d => console.log(`   - ${d.timestamp} | T: ${d.t}°C | Pluie: ${d.rr1}mm | Soleil: ${d.insolh}min`));
    }

    // 2. Tenter de récupérer le TOKEN MF pour vérifier l'API
    // On ne peut pas le faire facilement depuis le client local sans Service Key.
    console.log("\n2️⃣ Vérification API Météo-France (Simulation)...");
    console.log("   Pour vérifier l'API Source, j'ai besoin que vous vérifiez vos Logs Supabase.");
    console.log("   Cependant, au vu des données DB (si elles datent d'hier), l'hypothèse principale est :");
    console.log("   👉 Le robot insère ce qu'il reçoit. Si l'API envoie l'historique d'abord, on voit l'historique.");

    // ANALYSE
    if (dbData && dbData.length > 0) {
        const lastDate = new Date(dbData[0].timestamp);
        const now = new Date();
        const diffHours = (now - lastDate) / (1000 * 60 * 60);

        console.log("\n📊 ANALYSE DU RETARD :");
        console.log(`   Dernière donnée : ${lastDate.toLocaleString()}`);
        console.log(`   Retard constaté : ${diffHours.toFixed(1)} heures`);

        if (diffHours < 2) {
            console.log("   ✅ Tout est NORMAL. Données en temps réel.");
        } else if (diffHours < 24) {
            console.log("   ⚠️ Retard moyen. Le robot est peut-être en train de rattraper ou l'API lag.");
        } else {
            console.log("   ❌ Gros retard (>24h). Le robot ne traite peut-être pas les nouvelles données.");
        }
    }
}

runDiag();
