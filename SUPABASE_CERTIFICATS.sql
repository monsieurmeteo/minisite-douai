-- Création de la table certificats_meteo
create table if not exists public.certificats_meteo (
  id uuid default gen_random_uuid() primary key,
  nom_client text not null,
  adresse text,
  ville text,
  code_postal text,
  email_client text,
  
  date_sinistre date not null,
  heure_sinistre text,
  type_certificat text not null,
  
  station_reference text,
  station_id text,
  
  donnees_brutes_json jsonb, -- Stockage des stats et rows
  
  date_generation timestamptz default now(),
  pdf_url text, -- Lien vers le PDF si stocké (optionnel pour l'instant)
  statut_paiement text default 'en_attente', -- en_attente, paye, gratuit
  
  user_id uuid references auth.users(id) -- Si authentifié
);

-- Active Row Level Security
alter table public.certificats_meteo enable row level security;

-- Politique : Tout le monde peut lire/écrire pour l'instant (à restreindre selon auth)
create policy "Public Select" on public.certificats_meteo for select using (true);
create policy "Public Insert" on public.certificats_meteo for insert with check (true);
create policy "Public Update" on public.certificats_meteo for update using (true);
