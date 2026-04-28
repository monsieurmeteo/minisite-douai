// Test les deux clés (anon + service role) sur l'Edge Function collect-vigilance
const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SERVICE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';  // Nouvelle clé .env.local
const ANON_KEY    = 'sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP';

console.log('=== TEST TOKENS SUPABASE ===\n');

// Tester si la clé peut faire une requête REST simple
async function testKey(label, key) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stations?limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      signal: AbortSignal.timeout(8000)
    });
    console.log(`  ${label}: HTTP ${r.status} ${r.ok ? '✅' : '❌'}`);
    if (!r.ok) {
      const t = await r.text();
      console.log(`  Erreur: ${t.substring(0, 150)}`);
    }
  } catch(e) {
    console.log(`  ${label}: ❌ ${e.message}`);
  }
}

// Tester l'Edge Function avec les deux clés
async function testEdgeFunction(label, key) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/collect-vigilance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000)
    });
    console.log(`  Edge Function (${label}): HTTP ${r.status}`);
    const t = await r.text();
    console.log(`  Réponse: ${t.substring(0, 300)}`);
  } catch(e) {
    console.log(`  Edge Function (${label}): ❌ ${e.message}`);
  }
}

console.log('--- REST API ---');
await testKey('service_role (nouvelle clé)', SERVICE_KEY);
await testKey('anon key', ANON_KEY);

console.log('\n--- EDGE FUNCTION collect-vigilance ---');
await testEdgeFunction('service_role', SERVICE_KEY);

// Vérifier aussi les dernières données dans observations
console.log('\n--- DERNIÈRE DONNÉE EN BASE ---');
try {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/observations?select=*&order=created_at.desc&limit=3`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(8000)
  });
  if (r.ok) {
    const d = await r.json();
    if (d.length > 0) {
      d.forEach(row => {
        const dateKeys = Object.keys(row).filter(k => k.includes('date') || k.includes('time') || k.includes('created'));
        console.log('  Entrée:', dateKeys.map(k => `${k}: ${row[k]}`).join(', '));
      });
    } else {
      console.log('  Table observations vide');
    }
  }
} catch(e) { console.log('  Timeout/Erreur:', e.message); }

// Vérifier les dernières vigilances
try {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/vigilance?select=*&order=created_at.desc&limit=3`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(8000)
  });
  if (r.ok) {
    const d = await r.json();
    if (d.length > 0) {
      d.forEach(row => {
        const dateKeys = Object.keys(row).filter(k => k.includes('date') || k.includes('time') || k.includes('created'));
        console.log('  Vigilance:', dateKeys.map(k => `${k}: ${row[k]}`).join(', '));
      });
    } else {
      console.log('  Table vigilance vide');
    }
  }
} catch(e) { console.log('  Timeout/Erreur:', e.message); }

console.log('\n=== FIN ===');
