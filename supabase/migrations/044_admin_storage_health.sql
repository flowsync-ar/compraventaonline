-- Panel admin "Métricas" (versión acotada: salud de Storage/imágenes).
-- Devuelve, por bucket, conteo/tamaño total, histograma de tamaños, los
-- archivos más pesados (con el vendedor dueño, cuando aplica) y los
-- archivos de "listings" que ya no están referenciados por ningún
-- producto (candidatos a limpieza). Todo cruzado contra nuestras propias
-- tablas — esto es exactamente lo que el dashboard de Supabase no puede
-- mostrar, porque no conoce el negocio.
--
-- SECURITY DEFINER + search_path explícito: la misma clase de bug que
-- rompió el registro de usuarios (handle_new_user, ver 20260824) fue un
-- SECURITY DEFINER sin search_path fijo — no repetirlo acá.
create or replace function admin_get_storage_health()
returns json
language sql
security definer
set search_path = public, storage
as $$
  with objects as (
    select
      o.id,
      o.bucket_id,
      o.name,
      coalesce((o.metadata->>'size')::bigint, 0) as size_bytes,
      o.created_at,
      case when o.bucket_id = 'listings' then (storage.foldername(o.name))[1] else null end as seller_id_text
    from storage.objects o
    where o.bucket_id in ('listings', 'avatars', 'hero-slides')
  ),
  by_bucket as (
    select
      bucket_id,
      count(*) as file_count,
      coalesce(sum(size_bytes), 0) as total_bytes,
      coalesce(avg(size_bytes), 0)::bigint as avg_bytes,
      coalesce(max(size_bytes), 0) as max_bytes
    from objects
    group by bucket_id
  ),
  histogram as (
    select
      bucket_id,
      count(*) filter (where size_bytes < 500000) as under_500kb,
      count(*) filter (where size_bytes >= 500000 and size_bytes < 1000000) as kb500_1mb,
      count(*) filter (where size_bytes >= 1000000 and size_bytes < 2000000) as mb1_2,
      count(*) filter (where size_bytes >= 2000000 and size_bytes < 5000000) as mb2_5,
      count(*) filter (where size_bytes >= 5000000) as over_5mb
    from objects
    group by bucket_id
  ),
  largest_raw as (
    select bucket_id, name, size_bytes, created_at, seller_id_text
    from objects
    order by size_bytes desc
    limit 20
  ),
  largest as (
    select
      l.bucket_id, l.name, l.size_bytes, l.created_at,
      s.name as seller_name, s.username as seller_username
    from largest_raw l
    left join sellers s on s.id::text = l.seller_id_text
  ),
  orphaned as (
    select o.name, o.size_bytes
    from objects o
    where o.bucket_id = 'listings'
      and not exists (
        select 1
        from products p, unnest(p.images) as img_url
        where p.images is not null and img_url like '%' || o.name
      )
  )
  select json_build_object(
    'by_bucket', coalesce((select json_agg(by_bucket) from by_bucket), '[]'::json),
    'histogram', coalesce((select json_agg(histogram) from histogram), '[]'::json),
    'largest', coalesce((select json_agg(largest) from largest), '[]'::json),
    'orphaned_count', (select count(*) from orphaned),
    'orphaned_bytes', coalesce((select sum(size_bytes) from orphaned), 0)
  );
$$;

grant execute on function admin_get_storage_health() to service_role;
