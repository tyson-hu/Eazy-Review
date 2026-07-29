-- Task 12: positive least-privilege RLS policies and explicit Data API grants.
-- Task 11 remains the schema/trigger foundation. This migration adds no RPC,
-- changes no aggregate implementation, and keeps every client-facing table
-- protected by RLS.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.eazy_assessments enable row level security;
alter table public.user_ratings enable row level security;
alter table public.rating_aggregates enable row level security;
alter table public.product_offers enable row level security;

-- ---------------------------------------------------------------------------
-- Published catalog reads
-- ---------------------------------------------------------------------------

create policy "anon_select_published_products"
on public.products
for select
to anon
using (is_published = true);

create policy "authenticated_select_published_products"
on public.products
for select
to authenticated
using (is_published = true);

create policy "anon_select_published_product_images"
on public.product_images
for select
to anon
using (
  exists (
    select 1
    from public.products as p
    where p.id = product_images.product_id
      and p.is_published = true
  )
);

create policy "authenticated_select_published_product_images"
on public.product_images
for select
to authenticated
using (
  exists (
    select 1
    from public.products as p
    where p.id = product_images.product_id
      and p.is_published = true
  )
);

create policy "anon_select_current_published_eazy_assessments"
on public.eazy_assessments
for select
to anon
using (
  is_current = true
  and exists (
    select 1
    from public.products as p
    where p.id = eazy_assessments.product_id
      and p.is_published = true
  )
);

create policy "authenticated_select_current_published_eazy_assessments"
on public.eazy_assessments
for select
to authenticated
using (
  is_current = true
  and exists (
    select 1
    from public.products as p
    where p.id = eazy_assessments.product_id
      and p.is_published = true
  )
);

create policy "anon_select_published_rating_aggregates"
on public.rating_aggregates
for select
to anon
using (
  exists (
    select 1
    from public.products as p
    where p.id = rating_aggregates.product_id
      and p.is_published = true
  )
);

create policy "authenticated_select_published_rating_aggregates"
on public.rating_aggregates
for select
to authenticated
using (
  exists (
    select 1
    from public.products as p
    where p.id = rating_aggregates.product_id
      and p.is_published = true
  )
);

create policy "anon_select_published_product_offers"
on public.product_offers
for select
to anon
using (
  exists (
    select 1
    from public.products as p
    where p.id = product_offers.product_id
      and p.is_published = true
  )
);

create policy "authenticated_select_published_product_offers"
on public.product_offers
for select
to authenticated
using (
  exists (
    select 1
    from public.products as p
    where p.id = product_offers.product_id
      and p.is_published = true
  )
);

-- ---------------------------------------------------------------------------
-- Owner-only profiles
-- ---------------------------------------------------------------------------

create policy "authenticated_select_own_profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = profiles.id
);

create policy "authenticated_update_own_profile"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = profiles.id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = profiles.id
);

-- ---------------------------------------------------------------------------
-- Owner-only My Rating CRUD
-- ---------------------------------------------------------------------------

create policy "authenticated_select_own_user_ratings"
on public.user_ratings
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_ratings.user_id
);

create policy "authenticated_insert_own_published_user_rating"
on public.user_ratings
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_ratings.user_id
  and exists (
    select 1
    from public.products as p
    where p.id = user_ratings.product_id
      and p.is_published = true
  )
);

create policy "authenticated_update_own_published_user_rating"
on public.user_ratings
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_ratings.user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_ratings.user_id
  and exists (
    select 1
    from public.products as p
    where p.id = user_ratings.product_id
      and p.is_published = true
  )
);

create policy "authenticated_delete_own_user_rating"
on public.user_ratings
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_ratings.user_id
);

-- ---------------------------------------------------------------------------
-- Explicit privilege rebuild
-- ---------------------------------------------------------------------------

-- Privileges are additive. Clear inherited or pre-existing grants, including
-- service_role, before rebuilding the exact Task 12 allowlist.
revoke all privileges on table
  public.profiles,
  public.products,
  public.product_images,
  public.eazy_assessments,
  public.user_ratings,
  public.rating_aggregates,
  public.product_offers
from public, anon, authenticated, service_role;

grant select on table
  public.products,
  public.product_images,
  public.eazy_assessments,
  public.rating_aggregates,
  public.product_offers
to anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, username, avatar_url)
  on table public.profiles
  to authenticated;

grant select, delete on table public.user_ratings to authenticated;
grant insert (
  product_id,
  user_id,
  look,
  comfort,
  quality,
  outfit,
  value,
  overall,
  private_note
)
  on table public.user_ratings
  to authenticated;
grant update (
  look,
  comfort,
  quality,
  outfit,
  value,
  overall,
  private_note
)
  on table public.user_ratings
  to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.products,
  public.product_images,
  public.eazy_assessments,
  public.user_ratings,
  public.rating_aggregates,
  public.product_offers
to service_role;

-- Preserve the Task 11 trigger/helper boundary even if project defaults differ.
revoke execute on function public.set_updated_at()
  from public, anon, authenticated;
revoke execute on function public.reject_user_rating_identity_change()
  from public, anon, authenticated;
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.create_zero_rating_aggregate()
  from public, anon, authenticated;
revoke execute on function public.refresh_rating_aggregates(uuid)
  from public, anon, authenticated;
revoke execute on function public.handle_user_rating_change()
  from public, anon, authenticated;
