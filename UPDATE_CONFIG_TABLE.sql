
-- Table de configuration globale pour l'application BTP
-- Permet de stocker la liste des métiers et autres paramètres globaux

CREATE TABLE IF NOT EXISTS btp_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) -- Optionnel, si on veut une config par utilisateur
);

-- Activation RLS
ALTER TABLE btp_config ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour l'instant (tout le monde peut lire/écrire si authentifié, ou public selon vos règles)
-- Si vous utilisez l'auth Supabase :
CREATE POLICY "Users can manage their own config" ON btp_config
    FOR ALL USING (auth.uid() = user_id);

-- Insertion de la liste des métiers par défaut si elle n'existe pas
INSERT INTO btp_config (key, value)
VALUES (
    'trades_list', 
    '["Terrassement / Terrassement Voiries", "VRD – Voiries et Réseaux Divers", "Renforcement de sol / Traitement de sol", "Traitement de plateforme (chaux / ciment)", "Travaux Asphalte / Enrobés", "Rabattage de nappes", "Gros œuvre", "Fondations / Fondations spéciales", "Béton armé", "Coulage béton armé / Dalles", "Dallage", "Charpente", "Murs coupe-feu", "Couverture", "Bardage / Panneaux", "Étanchéité", "Isolation", "Menuiseries extérieures", "Métallerie", "Clôtures", "Espaces verts", "Ravalement / Peinture extérieure", "Grues / Bétonnières", "Levage d''éléments techniques", "Aires de béquillage", "Tous travaux extérieurs / Tâches extérieures", "Tous corps d’état", "Murs coupe feu"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
