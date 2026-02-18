-- Fonction pour trouver les stations les plus proches d'un point GPS
-- Utilise la formule Haversine pour calculer la distance km
create or replace function find_nearest_stations(
  lat_input float,
  lon_input float,
  limit_count int default 10
)
returns table (
  id text,
  name text,
  lat double precision,
  lon double precision,
  dist_km double precision
)
language plpgsql
as $$
begin
  return query
  select
    s.id,
    s.name,
    s.lat,
    s.lon,
    (
      6371 * acos(
        cos(radians(lat_input)) * cos(radians(s.lat)) * cos(radians(s.lon) - radians(lon_input)) +
        sin(radians(lat_input)) * sin(radians(s.lat))
      )
    ) as dist_km
  from stations s
  where s.lat is not null and s.lon is not null
  order by dist_km asc
  limit limit_count;
end;
$$;
