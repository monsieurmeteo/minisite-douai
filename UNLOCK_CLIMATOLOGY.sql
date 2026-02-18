
-- ==============================================================================
-- 🔓 DÉVERROUILLAGE CLIMATOLOGIE POUR IMPORT
-- ==============================================================================

-- 1. On s'assure que la table station_climatology est accessible en écriture pour l'import
ALTER TABLE public.station_climatology ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for import" ON public.station_climatology;
CREATE POLICY "Allow all for import" ON public.station_climatology FOR ALL USING (true) WITH CHECK (true);

-- 2. On s'assure aussi que l'API peut lire sans restrictions
GRANT ALL ON TABLE public.station_climatology TO anon, authenticated;

-- 3. Optionnel: On relaxe aussi get_supervision_records pour renvoyer plus de 1000 lignes si besoin
-- (Déjà géré par la pagination frontend normalement)
