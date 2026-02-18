
-- IMPORTANT : Ce script autorise le site web à enregistrer des données
-- C'est nécessaire car par défaut Supabase bloque l'écriture publique

-- 1. Autoriser l'insertion pour tout le monde (Public/Anon) sur la table 6mn
DROP POLICY IF EXISTS "Ecriture système seulement" ON observations_6mn;
DROP POLICY IF EXISTS "Ecriture publique" ON observations_6mn;

CREATE POLICY "Ecriture publique" ON observations_6mn
    FOR INSERT 
    WITH CHECK (true);

-- 2. Autoriser la mise à jour (Upsert) pour éviter les doublons
CREATE POLICY "Mise à jour publique" ON observations_6mn
    FOR UPDATE
    USING (true);

-- Vérification
SELECT count(*) as "Nombre de lignes" FROM observations_6mn;
