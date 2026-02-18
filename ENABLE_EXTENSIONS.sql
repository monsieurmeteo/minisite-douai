-- Activer l'extension pour les requêtes HTTP (Nécessaire pour envoyer les mails)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Vérification (Optionnel, juste pour info)
SELECT * FROM pg_extension WHERE extname = 'pg_net';
