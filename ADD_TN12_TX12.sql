-- Ajouté des colonnes tn12 et tx12 pour stocker les extrêmes précis (infra-horaires)
alter table observations_horaire 
add column if not exists tn12 numeric,
add column if not exists tx12 numeric;

-- Indexation si nécessaire
-- create index if not exists idx_obs_tn12 on observations_horaire(tn12);
