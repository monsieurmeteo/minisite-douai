-- 1. Table pour stocker vos configurations d'alertes
CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    station_id TEXT NOT NULL, -- L'ID de la station à surveiller
    station_name TEXT,        -- Juste pour l'affichage (ex: "Douai")
    parameter TEXT NOT NULL,  -- 'wind', 'rain', 'temp_high', 'temp_low'
    threshold FLOAT NOT NULL, -- Le seuil (ex: 30, 0, -5)
    last_triggered_at TIMESTAMPTZ -- Pour éviter de spammer (1 mail par heure max par ex)
);

-- Active RLS mais permet l'accès public pour l'instant (pour votre usage perso facile)
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON user_alerts FOR ALL USING (true) WITH CHECK (true);


-- 2. Fonction de vérification (Le Cerveau)
CREATE OR REPLACE FUNCTION check_smart_alerts()
RETURNS TRIGGER AS $$
DECLARE
    alert RECORD;
    should_fire BOOLEAN;
BEGIN
    -- On parcourt toutes les alertes configurées pour CETTE station
    FOR alert IN SELECT * FROM user_alerts WHERE station_id = NEW.station_id
    LOOP
        should_fire := FALSE;

        -- Vérification selon le type de paramètre
        -- Vent (Rafale > Seuil)
        IF alert.parameter = 'wind' AND NEW.fxi IS NOT NULL AND NEW.fxi >= alert.threshold THEN
            should_fire := TRUE;
        END IF;

        -- Pluie (Pluie 1h > Seuil)
        -- Note : rr_per est parfois null, on considère 0
        IF alert.parameter = 'rain' AND COALESCE(NEW.rr_per, 0) >= alert.threshold THEN
            should_fire := TRUE;
        END IF;

        -- Température Haute (Temp > Seuil) -> Canicule etc.
        IF alert.parameter = 'temp_high' AND NEW.t IS NOT NULL AND NEW.t >= alert.threshold THEN
            should_fire := TRUE;
        END IF;

        -- Température Basse (Temp < Seuil) -> Gel etc.
        IF alert.parameter = 'temp_low' AND NEW.t IS NOT NULL AND NEW.t <= alert.threshold THEN
            should_fire := TRUE;
        END IF;


        -- SI conditions remplies ET pas d'alerte envoyée pour cette règle depuis 1h (Anti-Spam)
        IF should_fire AND (alert.last_triggered_at IS NULL OR alert.last_triggered_at < NOW() - INTERVAL '1 hour') THEN
            
            -- 1. Appeler l'API d'envoi de mail
            PERFORM net.http_post(
                url := 'https://minisite-douai.vercel.app/api/send-alert?secret=meteo-alert-secure-token-2026',
                body := jsonb_build_object(
                    'to_email', alert.email,
                    'station', alert.station_name || ' (' || alert.station_id || ')',
                    'value', CASE 
                        WHEN alert.parameter = 'wind' THEN NEW.fxi
                        WHEN alert.parameter = 'rain' THEN NEW.rr_per
                        ELSE NEW.t
                    END,
                    'time', NEW.timestamp
                )
            );

            -- 2. Mettre à jour le timestamp pour éviter le spam
            UPDATE user_alerts SET last_triggered_at = NOW() WHERE id = alert.id;
            
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. Attacher le Trigger
DROP TRIGGER IF EXISTS trigger_smart_alerts ON observations_6mn;

CREATE TRIGGER trigger_smart_alerts
AFTER INSERT ON observations_6mn
FOR EACH ROW
EXECUTE FUNCTION check_smart_alerts();
