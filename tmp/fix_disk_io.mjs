/**
 * Script de diagnostic et nettoyage immédiat du Disk IO Supabase
 * Exécuter avec : node tmp/fix_disk_io.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('=== DIAGNOSTIC DISK IO SUPABASE ===\n');

  // Tables à vérifier  
  const tables = ['observations_6mn', 'observations_horaire', 'observations'];

  for (const table of tables) {
    // Compter les enregistrements totaux
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${table}' : n'existe pas`);
      } else {
        console.log(`⚠️  Table '${table}' : erreur - ${error.message}`);
      }
      continue;
    }

    console.log(`✅ Table '${table}' : ${count?.toLocaleString('fr-FR')} enregistrements`);

    // Trouver la plus vieille et la plus récente entrée
    const tsField = table === 'observations' ? 'date_obs' : 'timestamp';
    
    const { data: oldest } = await supabase
      .from(table).select(tsField).order(tsField, { ascending: true }).limit(1);
    const { data: newest } = await supabase
      .from(table).select(tsField).order(tsField, { ascending: false }).limit(1);
    
    if (oldest?.[0]) console.log(`   → Plus ancienne : ${oldest[0][tsField]}`);
    if (newest?.[0]) console.log(`   → Plus récente  : ${newest[0][tsField]}`);
    console.log('');
  }
}

async function cleanupOldData() {
  console.log('\n=== NETTOYAGE IMMÉDIAT ===\n');

  // Supprimer les données > 30 jours dans observations_6mn
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff6m = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

  const cleanups = [
    { table: 'observations_6mn', field: 'timestamp', cutoff: cutoff30, label: '30 jours' },
    { table: 'observations_horaire', field: 'timestamp', cutoff: cutoff6m, label: '6 mois' },
    { table: 'observations', field: 'date_obs', cutoff: cutoff6m, label: '6 mois' },
  ];

  for (const { table, field, cutoff, label } of cleanups) {
    // Count before
    const { count: before } = await supabase.from(table).select('*', { count: 'exact', head: true }).lt(field, cutoff);
    
    if (before === null) { console.log(`⏭️  ${table} : table inaccessible, skipping`); continue; }
    if (before === 0) { console.log(`✅  ${table} : rien à supprimer (< ${label})`); continue; }
    
    console.log(`🗑️  ${table} : suppression de ${before?.toLocaleString('fr-FR')} lignes > ${label}...`);
    
    const { error } = await supabase.from(table).delete().lt(field, cutoff);
    
    if (error) {
      console.log(`❌  Erreur : ${error.message}`);
    } else {
      console.log(`✅  Supprimé ! IO devrait baisser.`);
    }
  }
}

async function main() {
  await diagnose();
  await cleanupOldData();
  console.log('\n=== TERMINÉ ===');
  console.log('\n⚠️  Pour la politique de rétention automatique, applique le SQL');
  console.log('   dans supabase/migrations/20260406140000_add_retention_policy.sql');
  console.log('   via le SQL Editor de Supabase dashboard.\n');
}

main().catch(console.error);
