-- Task 11 core schema: the seven tables from the Task 11 Schema Contract in
-- docs/DATA_MODEL.md, with their constraints and indexes; Packet 3
-- trigger/function helpers (profile creation, Community Score refresh,
-- immutable rating identity, server-maintained timestamps); and Packet 4
-- Deny-by-default RLS enable plus REVOKE ALL from PUBLIC/anon/authenticated
-- on every exposed table. No client policies or positive client grants
-- (Task 12). Locally verified via `npm run test:db:reset` (2026-07-27).
--
-- gen_random_uuid() is built into PostgreSQL 13+ core and the GIN index below
-- uses only built-in full-text search, so no extension is required.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  sku text unique,
  size_type text,
  release_date date,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_brand_idx on public.products (brand);
create index products_name_idx
  on public.products using gin (to_tsvector('english', name));
create index products_created_at_idx
  on public.products (created_at desc);
create index products_published_idx
  on public.products (is_published) where is_published;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create table public.eazy_assessments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  look int check (look between 1 and 10),
  comfort int check (comfort between 1 and 10),
  quality int check (quality between 1 and 10),
  outfit int check (outfit between 1 and 10),
  value int check (value between 1 and 10),
  maintenance int check (maintenance between 1 and 10),
  material int check (material between 1 and 10),
  details int check (details between 1 and 10),
  collection int check (collection between 1 and 10),
  overall int check (overall between 1 and 10),
  score int check (score between 0 and 100),
  methodology_version text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index eazy_assessments_one_current_per_product
  on public.eazy_assessments (product_id)
  where is_current;

create table public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  look int not null check (look between 1 and 10),
  comfort int not null check (comfort between 1 and 10),
  quality int not null check (quality between 1 and 10),
  outfit int not null check (outfit between 1 and 10),
  value int not null check (value between 1 and 10),
  overall int not null check (overall between 1 and 10),
  private_note text
    check (private_note is null or char_length(private_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index user_ratings_product_id_idx
  on public.user_ratings (product_id);
create index user_ratings_user_id_idx
  on public.user_ratings (user_id);
create index user_ratings_created_at_idx
  on public.user_ratings (created_at desc);

create table public.rating_aggregates (
  product_id uuid primary key references public.products(id) on delete cascade,
  rating_count int not null default 0,
  look_avg numeric(4,2),
  comfort_avg numeric(4,2),
  quality_avg numeric(4,2),
  outfit_avg numeric(4,2),
  value_avg numeric(4,2),
  overall_avg numeric(4,2),
  score int check (score between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  website_name text not null,
  website_link text not null,
  size numeric(4,1)
    check (
      size is null
      or (size >= 0 and size <> 'NaN'::numeric)
    ),
  size_region text not null default 'US'
    check (size_region in ('US')),
  currency text not null default 'USD'
    check (currency in ('USD')),
  price numeric(10,2)
    check (
      price is null
      or (price >= 0 and price <> 'NaN'::numeric)
    ),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_offers_product_id_idx
  on public.product_offers (product_id);
create index product_offers_price_idx
  on public.product_offers (price);
create index product_offers_size_idx
  on public.product_offers (size);

-- ---------------------------------------------------------------------------
-- Packet 3: triggers and functions
-- ---------------------------------------------------------------------------

-- Server-maintained updated_at (SECURITY INVOKER).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

create trigger eazy_assessments_set_updated_at
  before update on public.eazy_assessments
  for each row
  execute function public.set_updated_at();

create trigger user_ratings_set_updated_at
  before update on public.user_ratings
  for each row
  execute function public.set_updated_at();

create trigger product_offers_set_updated_at
  before update on public.product_offers
  for each row
  execute function public.set_updated_at();

-- Immutable user_ratings identity (SECURITY INVOKER).
create or replace function public.reject_user_rating_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.product_id is distinct from old.product_id
    or new.user_id is distinct from old.user_id then
    raise exception
      'user_ratings.product_id and user_ratings.user_id are immutable';
  end if;
  return new;
end;
$$;

create trigger user_ratings_immutable_identity_trigger
  before update on public.user_ratings
  for each row
  execute function public.reject_user_rating_identity_change();

-- auth.users → public.profiles (trigger-only SECURITY DEFINER).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Product INSERT is the only path that INSERTs a zero-count aggregate row.
create or replace function public.create_zero_rating_aggregate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.rating_aggregates (product_id, rating_count)
  values (new.id, 0);
  return new;
end;
$$;

create trigger products_create_rating_aggregate_trigger
  after insert on public.products
  for each row
  execute function public.create_zero_rating_aggregate();

-- Inner Community Score refresh (SECURITY INVOKER). Updates only; skips when
-- the product row is gone so cascaded rating deletes during product DELETE do
-- not recreate an aggregate.
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

  perform pg_advisory_xact_lock(hashtext(p_product_id::text));

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

-- Aggregate-write entrypoint (trigger-only SECURITY DEFINER).
create or replace function public.handle_user_rating_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if tg_op = 'DELETE' then
    v_product_id := old.product_id;
  else
    v_product_id := new.product_id;
  end if;

  perform public.refresh_rating_aggregates(v_product_id);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_user_rating_change() from public;
revoke execute on function public.handle_user_rating_change()
  from anon, authenticated;

create trigger user_ratings_refresh_aggregates_trigger
  after insert or update or delete on public.user_ratings
  for each row
  execute function public.handle_user_rating_change();

-- ---------------------------------------------------------------------------
-- Packet 4: deny-by-default RLS + privilege revocation (no policies, no grants)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
revoke all privileges on table public.profiles from public;
revoke all privileges on table public.profiles from anon, authenticated;

alter table public.products enable row level security;
revoke all privileges on table public.products from public;
revoke all privileges on table public.products from anon, authenticated;

alter table public.product_images enable row level security;
revoke all privileges on table public.product_images from public;
revoke all privileges on table public.product_images from anon, authenticated;

alter table public.eazy_assessments enable row level security;
revoke all privileges on table public.eazy_assessments from public;
revoke all privileges on table public.eazy_assessments from anon, authenticated;

alter table public.user_ratings enable row level security;
revoke all privileges on table public.user_ratings from public;
revoke all privileges on table public.user_ratings from anon, authenticated;

alter table public.rating_aggregates enable row level security;
revoke all privileges on table public.rating_aggregates from public;
revoke all privileges on table public.rating_aggregates from anon, authenticated;

alter table public.product_offers enable row level security;
revoke all privileges on table public.product_offers from public;
revoke all privileges on table public.product_offers from anon, authenticated;
