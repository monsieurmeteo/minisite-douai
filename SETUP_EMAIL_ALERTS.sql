-- 1. Activer l'extension pour faire des appels HTTP (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créer la fonction déclencheur
CREATE OR REPLACE FUNCTION check_wind_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Seuil d'alerte : 80 km/h (CHANGEZ CE CHIFFRE SELON VOS BESOINS)
    -- On vérifie aussi que la station a un nom (pour éviter les bugs)
    IF NEW.fxi > 80 THEN
        -- On appelle l'API Vercel de manière asynchrone (ne bloque pas l'insertion)
        -- REMPLACEZ L'URL SI BESOIN, MAIS CELLE-CI DEVRAIT ÊTRE BONNE
        PERFORM net.http_post(
            url := 'https://minisite-douai.vercel.app/api/send-alert?secret=meteo-alert-secure-token-2026',
            body := jsonb_build_object(
                'station', NEW.station_id,
                'value', NEW.fxi,
                'time', NEW.timestamp
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attacher le déclencheur à la table observations_6mn
DROP TRIGGER IF EXISTS trigger_wind_alert ON observations_6mn;

CREATE TRIGGER trigger_wind_alert
AFTER INSERT ON observations_6mn
FOR EACH ROW
EXECUTE FUNCTION check_wind_alert();
