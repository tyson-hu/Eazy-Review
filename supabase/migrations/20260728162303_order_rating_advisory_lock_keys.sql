-- Acquire the actual advisory-lock keys in one stable order. The preceding
-- migration ordered product UUIDs before mapping them through 32-bit
-- hashtext(), so crossed hash ordering could still invert lock acquisition.

create or replace function public.refresh_rating_aggregates(p_product_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    return;
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_product_id::text, 0)
  );

  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    return;
  end if;

  update public.rating_aggregates as ra
  set
    rating_count = s.rating_count,
    look_avg = s.look_avg,
    comfort_avg = s.comfort_avg,
    quality_avg = s.quality_avg,
    outfit_avg = s.outfit_avg,
    value_avg = s.value_avg,
    overall_avg = s.overall_avg,
    score = s.score,
    updated_at = now()
  from (
    select
      count(*)::int as rating_count,
      round(avg(ur.look)::numeric, 2) as look_avg,
      round(avg(ur.comfort)::numeric, 2) as comfort_avg,
      round(avg(ur.quality)::numeric, 2) as quality_avg,
      round(avg(ur.outfit)::numeric, 2) as outfit_avg,
      round(avg(ur.value)::numeric, 2) as value_avg,
      round(avg(ur.overall)::numeric, 2) as overall_avg,
      round(avg(ur.overall) * 10)::int as score
    from public.user_ratings as ur
    where ur.product_id = p_product_id
  ) as s
  where ra.product_id = p_product_id;
end;
$$;

revoke execute on function public.refresh_rating_aggregates(uuid)
  from public;
revoke execute on function public.refresh_rating_aggregates(uuid)
  from anon, authenticated;

create or replace function public.handle_user_rating_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if tg_op = 'INSERT' then
    for v_product_id in
      select affected.product_id
      from (
        select distinct
          nr.product_id,
          pg_catalog.hashtextextended(nr.product_id::text, 0) as lock_key
        from new_rating_rows as nr
      ) as affected
      order by
        affected.lock_key,
        affected.product_id
    loop
      perform public.refresh_rating_aggregates(v_product_id);
    end loop;
  elsif tg_op = 'UPDATE' then
    for v_product_id in
      select affected.product_id
      from (
        select orr.product_id
        from old_rating_rows as orr
        union
        select nr.product_id
        from new_rating_rows as nr
      ) as affected
      order by
        pg_catalog.hashtextextended(affected.product_id::text, 0),
        affected.product_id
    loop
      perform public.refresh_rating_aggregates(v_product_id);
    end loop;
  elsif tg_op = 'DELETE' then
    for v_product_id in
      select affected.product_id
      from (
        select distinct
          orr.product_id,
          pg_catalog.hashtextextended(orr.product_id::text, 0) as lock_key
        from old_rating_rows as orr
      ) as affected
      order by
        affected.lock_key,
        affected.product_id
    loop
      perform public.refresh_rating_aggregates(v_product_id);
    end loop;
  end if;

  return null;
end;
$$;

revoke execute on function public.handle_user_rating_change() from public;
revoke execute on function public.handle_user_rating_change()
  from anon, authenticated;
