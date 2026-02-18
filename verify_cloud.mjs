import fs from 'fs';

// On récupère la clé publique pour le test (suffisant pour invoquer)
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjUwNjgsImV4cCI6MjA4NDM0MTA2OH0.RwWP38w9MXhM9ySNzZJp1scCqrgoymKWI2AvrUf_DG8";
const FUNCTION_URL = "https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn";

async function verifyCloud() {
    console.log("📡 Test de connexion avec le Robot Cloud...");
    console.log(`🔗 URL: ${FUNCTION_URL}`);

    try {
        const res = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        console.log("\n✅ RÉPONSE DU ROBOT CLOUD :");
        console.log(JSON.stringify(data, null, 2));

        if (data.success || data.status === "Up to date") {
            console.log("\n🎉 CONFIRMÉ ! Le robot est fonctionnel et connecté à Météo France.");
            console.log("   Il se mettra (ou s'est déjà mis) à jour automatiquement.");
        } else {
            console.log("\n⚠️  Le robot a répondu mais le résultat est inattendu.");
        }

    } catch (error) {
        console.error("\n❌ ÉCHEC DU TEST :");
        console.error(error.message);
    }
}

verifyCloud();
