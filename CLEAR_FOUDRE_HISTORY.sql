-- VIDER L'HISTORIQUE DES IMPACTS DE FOUDRE
-- Cela supprime toutes les données de la table lightning_strikes
-- mais conserve la structure de la table pour les futurs enregistrements (si réactivé)

TRUNCATE TABLE lightning_strikes;

-- Si vous voulez vraiment supprimer la table :
-- DROP TABLE lightning_strikes;
