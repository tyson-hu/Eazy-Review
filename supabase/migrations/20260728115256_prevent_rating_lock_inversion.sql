-- Refresh rating aggregates once per statement so every affected product lock
-- is acquired in stable UUID order. The previous row trigger could retain one
-- product's transaction advisory lock and then request another in the opposite
-- order of a concurrent multi-row delete, producing a deadlock.

drop trigger if exists user_ratings_refresh_aggregates_trigger
  on public.user_ratings;

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
      select distinct nr.product_id
      from new_rating_rows as nr
      order by nr.product_id
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
      order by affected.product_id
    loop
      perform public.refresh_rating_aggregates(v_product_id);
    end loop;
  elsif tg_op = 'DELETE' then
    for v_product_id in
      select distinct orr.product_id
      from old_rating_rows as orr
      order by orr.product_id
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

create trigger user_ratings_refresh_aggregates_insert_trigger
  after insert on public.user_ratings
  referencing new table as new_rating_rows
  for each statement
  execute function public.handle_user_rating_change();

create trigger user_ratings_refresh_aggregates_update_trigger
  after update on public.user_ratings
  referencing old table as old_rating_rows new table as new_rating_rows
  for each statement
  execute function public.handle_user_rating_change();

create trigger user_ratings_refresh_aggregates_delete_trigger
  after delete on public.user_ratings
  referencing old table as old_rating_rows
  for each statement
  execute function public.handle_user_rating_change();
