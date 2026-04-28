import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubdevaemtwbzxksjlhjg.supabase.co';
const SUPABASE_KEY = 'sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

console.log('=== DIAGNOSTIC SUPABASE ===\n');
console.log('Heure actuelle (Paris):', new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), '\n');

// 1. Lister toutes les tables accessibles
console.log('--- 1. TABLES DISPONIBLES ---');
try {
  const { data: tables, error } = await supabase
    .rpc('get_tables')
    .catch(() => ({ data: null, error: 'rpc not available' }));
  
  // Requête directe sur information_schema
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const schemaData = await res.json();
  console.log('Paths disponibles:', Object.keys(schemaData.paths || {}).slice(0, 20).join(', ') || 'Aucun');
} catch(e) {
  console.log('Erreur schema:', e.message);
}

// 2. Vérifier les tables principales
const tablesToCheck = [
  'observations',
  'observations_horaires', 
  'daily_summaries',
  'vigilance_data',
  'vigilance',
  'captures_vigilance',
  'meteo_observations',
  'stations',
  'radar_frames',
  'foudre',
  'foudre_archive',
];

console.log('\n--- 2. ÉTAT DES TABLES ---');
for (const table of tablesToCheck) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`  ❌ ${table}: TABLE N'EXISTE PAS`);
      } else {
        console.log(`  ⚠️ ${table}: Erreur - ${error.message} (code: ${error.code})`);
      }
    } else {
      console.log(`  ✅ ${table}: ${count} lignes`);
    }
  } catch(e) {
    console.log(`  💥 ${table}: Exception - ${e.message}`);
  }
}

// 3. Vérifier les dernières données pour les tables qui existent
console.log('\n--- 3. DERNIÈRES DONNÉES ---');
const existingTables = ['observations', 'observations_horaires', 'daily_summaries', 'vigilance_data', 'vigilance', 'captures_vigilance'];

for (const table of existingTables) {
  try {
    // Chercher les colonnes de date possibles
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (!error && data && data.length > 0) {
      const row = data[0];
      const dateFields = Object.keys(row).filter(k => 
        k.includes('date') || k.includes('time') || k.includes('created') || k.includes('horodatage') || k.includes('timestamp')
      );
      console.log(`\n  📋 ${table} - dernière entrée:`);
      dateFields.forEach(f => console.log(`    ${f}: ${row[f]}`));
      if (dateFields.length === 0) {
        console.log(`    Colonnes: ${Object.keys(row).join(', ')}`);
      }
    }
  } catch(e) { /* table n'existe pas */ }
}

// 4. Vérifier le Storage (buckets)
console.log('\n--- 4. BUCKETS STORAGE ---');
try {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.log('Erreur listing buckets:', error.message);
  } else if (!buckets || buckets.length === 0) {
    console.log('Aucun bucket trouvé');
  } else {
    for (const bucket of buckets) {
      console.log(`\n  🪣 ${bucket.name} (public: ${bucket.public})`);
      
      // Lister les fichiers récents
      const { data: files, error: fErr } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 5, sortBy: { column: 'updated_at', order: 'desc' } });
      
      if (fErr) {
        console.log(`     ⚠️ Erreur listing: ${fErr.message}`);
      } else if (files && files.length > 0) {
        files.forEach(f => {
          console.log(`     📁 ${f.name} - ${f.updated_at || 'date inconnue'}`);
        });
      } else {
        console.log('     (vide)');
      }
    }
  }
} catch(e) {
  console.log('Erreur storage:', e.message);
}

// 5. Vérifier les Edge Functions
console.log('\n--- 5. EDGE FUNCTIONS (appel direct) ---');
try {
  const testRes = await fetch(`${SUPABASE_URL}/functions/v1/collect-vigilance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ test: true }),
    signal: AbortSignal.timeout(10000)
  });
  console.log(`  collect-vigilance: HTTP ${testRes.status}`);
  const body = await testRes.text();
  console.log(`  Réponse: ${body.substring(0, 200)}`);
} catch(e) {
  console.log(`  ❌ collect-vigilance: ${e.message}`);
}

console.log('\n=== FIN DU DIAGNOSTIC ===');
