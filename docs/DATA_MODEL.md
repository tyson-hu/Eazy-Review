# Eazy Review Data Model

Use relational Supabase/PostgreSQL tables. Do not store product identity, images, offers, ratings, and summaries inside one giant product JSON object.

## Tables

- `profiles`: public user profile data.
- `products`: core product identity.
- `product_images`: one or more images for each product.
- `official_ratings`: app-builder Eazy Score ratings.
- `user_ratings`: one rating per user per product.
- `product_rating_summary`: calculated Community Score data.
- `product_offers`: purchase links and prices by size.

## Rating Categories

MVP user rating fields:
- `look`
- `comfort`
- `quality`
- `outfit`
- `value`
- `overall`
- `comment`

Eazy Score fields:
- `look`
- `comfort`
- `quality`
- `outfit`
- `value`
- `maintenance`
- `material`
- `details`
- `collection`
- `overall`
- `score`

Avoid unclear field names:
- Use `comfort`, not `comforts`.
- Use `maintenance`, not `maintain`.
- Use `value` or `resale_markup`, not `markups`.
- Use `details` or `craftsmanship`, not `meticulous`.
- Use `styling_difficulty` or `maintenance_difficulty`, not generic `difficulty`.

## Initial Schema

```sql
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_brand_idx on public.products (brand);
create index products_name_idx on public.products using gin (to_tsvector('english', name));
create index products_created_at_idx on public.products (created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.official_ratings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create index user_ratings_product_id_idx on public.user_ratings (product_id);
create index user_ratings_user_id_idx on public.user_ratings (user_id);
create index user_ratings_created_at_idx on public.user_ratings (created_at desc);

create table public.product_rating_summary (
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
  size numeric(4,1),
  size_region text default 'US',
  currency text default 'USD',
  price numeric(10,2),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_offers_product_id_idx on public.product_offers (product_id);
create index product_offers_price_idx on public.product_offers (price);
create index product_offers_size_idx on public.product_offers (size);
```

## Rating Summary Logic

The client app must not be trusted to calculate final Community Score.

Correct flow:

```txt
User submits rating
-> Supabase saves or updates user_ratings row
-> Database function recalculates product_rating_summary
-> App refetches Product Detail
```

```sql
create or replace function public.refresh_product_rating_summary(target_product_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.product_rating_summary (
    product_id,
    rating_count,
    look_avg,
    comfort_avg,
    quality_avg,
    outfit_avg,
    value_avg,
    overall_avg,
    score,
    updated_at
  )
  select
    product_id,
    count(*)::int as rating_count,
    round(avg(look)::numeric, 2),
    round(avg(comfort)::numeric, 2),
    round(avg(quality)::numeric, 2),
    round(avg(outfit)::numeric, 2),
    round(avg(value)::numeric, 2),
    round(avg(overall)::numeric, 2),
    round(avg(overall) * 10)::int as score,
    now()
  from public.user_ratings
  where product_id = target_product_id
  group by product_id
  on conflict (product_id)
  do update set
    rating_count = excluded.rating_count,
    look_avg = excluded.look_avg,
    comfort_avg = excluded.comfort_avg,
    quality_avg = excluded.quality_avg,
    outfit_avg = excluded.outfit_avg,
    value_avg = excluded.value_avg,
    overall_avg = excluded.overall_avg,
    score = excluded.score,
    updated_at = now();

  if not exists (
    select 1 from public.user_ratings where product_id = target_product_id
  ) then
    insert into public.product_rating_summary (
      product_id,
      rating_count,
      score,
      updated_at
    )
    values (
      target_product_id,
      0,
      null,
      now()
    )
    on conflict (product_id)
    do update set
      rating_count = 0,
      look_avg = null,
      comfort_avg = null,
      quality_avg = null,
      outfit_avg = null,
      value_avg = null,
      overall_avg = null,
      score = null,
      updated_at = now();
  end if;
end;
$$;

create or replace function public.handle_user_rating_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_rating_summary(old.product_id);
    return old;
  else
    perform public.refresh_product_rating_summary(new.product_id);
    return new;
  end if;
end;
$$;

create trigger user_ratings_refresh_summary_trigger
after insert or update or delete on public.user_ratings
for each row
execute function public.handle_user_rating_change();
```

## Row-Level Security

Enable RLS:

```sql
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.official_ratings enable row level security;
alter table public.user_ratings enable row level security;
alter table public.product_rating_summary enable row level security;
alter table public.product_offers enable row level security;
```

Public reads:

```sql
create policy "Public can read products"
on public.products for select
using (true);

create policy "Public can read product images"
on public.product_images for select
using (true);

create policy "Public can read official ratings"
on public.official_ratings for select
using (true);

create policy "Public can read rating summaries"
on public.product_rating_summary for select
using (true);

create policy "Public can read product offers"
on public.product_offers for select
using (true);
```

User ratings:

```sql
create policy "Public can read user ratings"
on public.user_ratings for select
using (true);

create policy "Users can insert own ratings"
on public.user_ratings for insert
with check (auth.uid() = user_id);

create policy "Users can update own ratings"
on public.user_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own ratings"
on public.user_ratings for delete
using (auth.uid() = user_id);
```

Profiles:

```sql
create policy "Public can read profiles"
on public.profiles for select
using (true);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

## Admin Eazy Score Workflow

The app builder needs a way to create Eazy Scores.

MVP options:
- Manually insert `official_ratings` rows in Supabase Table Editor.
- Use seed SQL.
- Later, create a script to import ratings from JSON/CSV.

Do not build an admin dashboard first.

## Import Rules

Do not implement scraping until the app core works. Scraping/importing should only populate:
- `products`
- `product_images`
- `product_offers`

Scraping should not write:
- `user_ratings`
- `product_rating_summary` directly
- `profiles`

Before scraping, confirm source permission, field fit, stable identifiers, and duplicate handling. Use SKU for duplicate detection when available.
