-- Fonction wrapper qui retourne TOUT en JSON pour éviter la pagination de 1000 lignes de Supabase
create or replace function get_daily_extremes_full(target_date date default current_date)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select coalesce(json_agg(t), '[]'::json) into result
  from (
    select
        d.station_id,
        min(d.t)::numeric as temp_min,
        max(d.t)::numeric as temp_max,
        max(d.ff)::numeric as wind_mean_max,
        max(d.fxi)::numeric as wind_gust_max,
        max(d.timestamp) as wind_gust_time,
        sum(coalesce(d.rr_per, 0))::numeric as rain_total,
        min(d.vv)::numeric as vis_min
    from observations_6mn d
    where d.timestamp >= target_date::timestamp
      and d.timestamp < (target_date + interval '1 day')::timestamp
    group by d.station_id
  ) t;
  
  return result;
end;
$$;
