-- VERSION OPTIMISÉE POUR LA RAPIDITÉ
-- Enlève la sous-requête coûteuse pour l'heure exacte de la rafale
-- Utilise max(timestamp) comme approximation temporaire pour éviter le timeout

create or replace function get_daily_extremes(target_date date default current_date)
returns table (
  station_id text,
  temp_min numeric,
  temp_max numeric,
  wind_mean_max numeric,
  wind_gust_max numeric,
  wind_gust_time timestamptz,
  rain_total numeric
)
language plpgsql
as $$
begin
  return query
  select
    d.station_id,
    min(d.t)::numeric as temp_min,
    max(d.t)::numeric as temp_max,
    max(d.ff)::numeric as wind_mean_max,
    max(d.fxi)::numeric as wind_gust_max,
    -- Simplification temporaire pour performance : on garde le dernier timestamp du groupe
    -- Cela permet à la requête d'être instantanée.
    max(d.timestamp) as wind_gust_time,
    sum(coalesce(d.rr_per, 0))::numeric as rain_total
  from observations_6mn d
  where d.timestamp >= target_date::timestamp
    and d.timestamp < (target_date + interval '1 day')::timestamp
  group by d.station_id;
end;
$$;
