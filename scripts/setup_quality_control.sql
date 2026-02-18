-- ============================================================
-- SYSTEME DE CONTRÔLE QUALITÉ ET VALIDATION
-- ============================================================

-- 1. Table pour mémoriser vos décisions (Validé / Rejeté)
CREATE TABLE IF NOT EXISTS observations_validation (
    observation_id BIGINT PRIMARY KEY, -- ID de l'observation dans observations_6mn
    status TEXT NOT NULL CHECK (status IN ('verified', 'rejected')),
    validated_by UUID REFERENCES auth.users(id), -- Qui a validé (optionnel)
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    comment TEXT
);

-- Index pour joindre rapidement
CREATE INDEX IF NOT EXISTS idx_obs_validation_id ON observations_validation(observation_id);

-- 2. Fonction pour récupérer les données suspectes (Dernières 24h)
-- Cette fonction applique des seuils "lâches" pour repérer les gros bugs
CREATE OR REPLACE FUNCTION get_suspicious_observations(
    lookback_hours INT DEFAULT 24
)
RETURNS TABLE (
    id BIGINT,
    station_id TEXT,
    timestamp TIMESTAMPTZ,
    param_name TEXT,
    value NUMERIC,
    threshold_msg TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.station_id,
        o.timestamp,
        CASE 
            WHEN o.t > 40 OR o.t < -20 THEN 'temp'
            WHEN o.fxi > 130 THEN 'wind'
            WHEN o.rr_per > 30 THEN 'rain'
            ELSE 'unknown'
        END as param_name,
        CASE 
            WHEN o.t > 40 OR o.t < -20 THEN o.t
            WHEN o.fxi > 130 THEN o.fxi
            WHEN o.rr_per > 30 THEN o.rr_per
            ELSE 0
        END as value,
        CASE 
            WHEN o.t > 40 THEN 'Température > 40°C'
            WHEN o.t < -20 THEN 'Température < -20°C'
            WHEN o.fxi > 130 THEN 'Rafale > 130 km/h'
            WHEN o.rr_per > 30 THEN 'Pluie > 30mm/6mn'
            ELSE 'Autre'
        END as threshold_msg
    FROM observations_6mn o
    LEFT JOIN observations_validation v ON o.id = v.observation_id
    WHERE o.timestamp > (NOW() - (lookback_hours || ' hours')::INTERVAL)
      AND v.observation_id IS NULL -- On ne montre pas ceux déjà validés/traités
      AND (
          (o.t IS NOT NULL AND (o.t > 40 OR o.t < -20)) OR
          (o.fxi IS NOT NULL AND o.fxi > 130) OR
          (o.rr_per IS NOT NULL AND o.rr_per > 30)
      )
    ORDER BY o.timestamp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction RPC pour agir (Valider ou Supprimer)
CREATE OR REPLACE FUNCTION manage_observation(
    target_id BIGINT,
    action_type TEXT, -- 'validate' ou 'delete'
    param_to_clear TEXT DEFAULT NULL -- 'temp', 'wind', 'rain' (si delete)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Nécessaire pour update/insert sans souci RLS admin
AS $$
DECLARE
    result JSONB;
BEGIN
    IF action_type = 'validate' THEN
        -- On marque comme 'verified'
        INSERT INTO observations_validation (observation_id, status)
        VALUES (target_id, 'verified')
        ON CONFLICT (observation_id) DO NOTHING;
        
        result := '{"status": "success", "message": "Observation validée"}'::JSONB;

    ELSIF action_type = 'delete' THEN
        -- On supprime la valeur (NULL) dans la table d'observations
        IF param_to_clear = 'temp' THEN
            UPDATE observations_6mn SET t = NULL WHERE id = target_id;
        ELSIF param_to_clear = 'wind' THEN
            UPDATE observations_6mn SET fxi = NULL, ff = NULL WHERE id = target_id;
        ELSIF param_to_clear = 'rain' THEN
            UPDATE observations_6mn SET rr_per = 0 WHERE id = target_id;
        ELSE
            -- Par défaut on supprime tout ? Non, dangereux.
            -- Si pas de param, on supprime la ligne entière (cas rare)
             DELETE FROM observations_6mn WHERE id = target_id;
        END IF;

        -- On ajoute aussi dans validation pour ne pas qu'elle revienne si jamais
        INSERT INTO observations_validation (observation_id, status)
        VALUES (target_id, 'rejected')
        ON CONFLICT (observation_id) DO NOTHING;

        result := '{"status": "success", "message": "Valeur supprimée"}'::JSONB;
    END IF;

    -- Si on a modifié une observation, on devrait peut-être rafraîchir le résumé du jour concerné
    -- (Optimisation future)

    RETURN result;
END;
$$;

-- 4. Droits d'accès
GRANT SELECT, INSERT ON observations_validation TO service_role;
GRANT SELECT ON observations_validation TO authenticated, anon; -- Lecture seule publique ok ?
GRANT EXECUTE ON FUNCTION get_suspicious_observations(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_observation(BIGINT, TEXT, TEXT) TO anon, authenticated;
