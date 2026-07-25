# Eazy Review Data Model

Use relational Supabase/PostgreSQL tables. Do not store product identity, images, offers, ratings, and summaries inside one giant product JSON object.

Separate three concerns — do not mix them in one large product table:

| Concern | Tables / fields | Meaning |
| --- | --- | --- |
| Product facts | `products`, `product_images`, `product_offers`, profile/use taxonomy | Brand, model, SKU, release, retail, materials, intended use |
| Editorial assessment | `eazy_assessments` | App-builder Eazy Score, verdict, strengths/weaknesses, methodology |
| Community evidence | `user_ratings`, `rating_aggregates` | Personal scores + owner-only `private_note`; server-owned Community Score |

UI names remain `Eazy Score`, `Community Score`, and `My Rating`. Internal table `eazy_assessments` replaces the earlier planned name `official_ratings`.

Task sequencing: `docs/TASKS.md` Tasks 11–18. Do not implement schema assumptions for deferred features until those tasks say so.

## Tables (Task 11 first slice)

- `profiles`: public user profile data (row created by `auth.users` trigger; clients update mutable fields only).
- `products`: core product identity and facts (`is_published` gates anonymous catalog reads).
- `product_images`: one or more images for each product.
- `eazy_assessments`: app-builder Eazy Score (editorial); prefer versioned rows with one current/active assessment.
- `user_ratings`: one rating per user per product (scores + `private_note`); `product_id` immutable after insert.
- `rating_aggregates`: calculated Community Score data (server-owned; clients must not write or execute refresh RPCs).
- `product_offers`: purchase links and prices by size (**required in Task 11** so Task 12 policies/grants and Task 14 Detail offers are not blocked).

Lookup / join tables (recommended defaults; decide in Task 11 planning if deferred one packet):

- `product_profiles` (lookup) + `products.profile_id` — short controlled list (performance, performance-lifestyle, daily-lifestyle, retro-runner, fashion-hybrid, recovery, luxury, collector, vintage).
- `product_intended_uses` (join) — multiple intended-use values per product.

## Rating Categories

MVP user rating fields:
- `look`
- `comfort`
- `quality`
- `outfit`
- `value`
- `overall`
- `private_note` (optional; max 500 characters; **owner-only**; not a public review)

Do **not** name the optional text field `comment` in the database or new API contracts — that implies public visibility. Public written reviews are out of MVP scope.

Eazy Score fields (editorial assessment):
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
- `score` (0–100 aggregate shown as Eazy Score in UI)

Avoid unclear field names:
- Use `comfort`, not `comforts`.
- Use `maintenance`, not `maintain`.
- Use `value` or `resale_markup`, not `markups`.
- Use `details` or `craftsmanship`, not `meticulous`.
- Use `styling_difficulty` or `maintenance_difficulty`, not generic `difficulty`.

## Provenance (plan in schema; populate as data arrives)

Prefer nullable columns early rather than inventing scrape pipelines:

- `source_type`
- `source_url` or source identifier
- `captured_at`
- `assessment_updated_at` / methodology on assessments
- `methodology_version`
- Image source and rights status on `product_images`

## Deferred fields (after My Rating persistence)

Do not block Task 11 on these; add only as nullable future-ready columns if the migration stays readable:

- Rating experience type, ownership duration, primary use.
- Foot-width / fit context, verified purchase flags (client must never set verified).
- Price-history snapshots, community-score freshness metrics.

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

-- Profile rows are created only by a trusted auth.users trigger (Task 11).
-- Clients get SELECT + column-level UPDATE in Task 12 — never INSERT.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  sku text unique,
  size_type text,
  release_date date,
  description text,
  -- Draft until published; anonymous catalog reads require is_published = true.
  is_published boolean not null default false,
  -- optional Task 11+: profile_id uuid references public.product_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_brand_idx on public.products (brand);
create index products_name_idx on public.products using gin (to_tsvector('english', name));
create index products_created_at_idx on public.products (created_at desc);
create index products_published_idx on public.products (is_published) where is_published;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  -- optional: source_type, rights_status, captured_at
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

-- Primary catalog image (Task 14 → Product.imageUrl / ProductCardData.imageUrl):
-- first row ordered by sort_order ASC, created_at ASC, id ASC.
-- Products with no images map to imageUrl: null. Task 13 seeds must use deliberate
-- unique sort_order values per product (enforced by the unique constraint above).

-- Editorial Eazy Score. Prefer one current row per product in MVP;
-- preserve history with is_current (or equivalent) rather than silent overwrite.
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
  private_note text check (private_note is null or char_length(private_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create index user_ratings_product_id_idx on public.user_ratings (product_id);
create index user_ratings_user_id_idx on public.user_ratings (user_id);
create index user_ratings_created_at_idx on public.user_ratings (created_at desc);

-- Server-owned Community Score aggregates. Clients must not INSERT/UPDATE/DELETE.
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
-> Database function recalculates rating_aggregates
-> App refetches Product Detail
```

Durable mechanism (Task 11): database function + trigger after user_rating insert/update/delete. Task 17 verifies concurrency, correctness, and forgery resistance; it does not re-select among trigger / RPC / schedule. Changing the mechanism later requires a superseding ADR and a forward migration.

Hard rules for aggregate SQL:
- `product_id` on `user_ratings` is **immutable** after insert (enforced by trigger). Re-rating another product means delete + insert, not moving the row.
- `refresh_rating_aggregates` and `handle_user_rating_change` are `SECURITY DEFINER` for trigger use only. **Revoke `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`** so clients cannot call them via RPC and forge aggregates.
- Prefer `set search_path = ''` with fully qualified `public.` relations inside definer functions.
- **Serialize refreshes per product** before reading `user_ratings`. Concurrent rating writes can otherwise each compute from a snapshot that omits the other transaction’s uncommitted row; the later `ON CONFLICT` upsert then overwrites a correct aggregate with a stale count/average until another mutation runs. Use a transaction-scoped advisory lock (or equivalent product-row lock) at the start of `refresh_rating_aggregates`.
- **Zero-count row on product create:** `products` AFTER INSERT ensures a `rating_aggregates` row with `rating_count = 0` so seeded/published products always have a joinable summary before any rating exists. Task 14 still normalizes a missing join to the canonical empty `ProductRatingSummary` as a safety net.

```sql
create or replace function public.refresh_rating_aggregates(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One refresh at a time per product within concurrent rating transactions.
  perform pg_advisory_xact_lock(
    hashtextextended(target_product_id::text, 0)
  );

  insert into public.rating_aggregates (
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
    insert into public.rating_aggregates (
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

create or replace function public.enforce_user_rating_product_id_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.product_id is distinct from old.product_id then
    raise exception 'user_ratings.product_id is immutable';
  end if;
  return new;
end;
$$;

create trigger user_ratings_product_id_immutable
before update on public.user_ratings
for each row
execute function public.enforce_user_rating_product_id_immutable();

-- Timestamps are server-owned. Clients do not receive UPDATE grants on
-- created_at / updated_at (or id); triggers maintain updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger user_ratings_set_updated_at
before update on public.user_ratings
for each row
execute function public.set_updated_at();

-- New auth users get a profiles row (identity key only). Clients cannot INSERT
-- profiles via the Data API; Account reads this row after Task 15 sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.handle_user_rating_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_rating_aggregates(old.product_id);
    return old;
  end if;

  perform public.refresh_rating_aggregates(new.product_id);
  return new;
end;
$$;

create trigger user_ratings_refresh_aggregates_trigger
after insert or update or delete on public.user_ratings
for each row
execute function public.handle_user_rating_change();

-- Every product gets a zero-count aggregate row at create time so Detail/Browse
-- joins never depend on a missing summary for unpublished→published seeds.
create or replace function public.ensure_rating_aggregate_for_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rating_aggregates (
    product_id,
    rating_count,
    score,
    updated_at
  )
  values (
    new.id,
    0,
    null,
    now()
  )
  on conflict (product_id) do nothing;
  return new;
end;
$$;

create trigger products_ensure_rating_aggregate
after insert on public.products
for each row
execute function public.ensure_rating_aggregate_for_product();

-- Clients must not invoke aggregate helpers via PostgREST RPC.
revoke all on function public.refresh_rating_aggregates(uuid) from public;
revoke all on function public.refresh_rating_aggregates(uuid) from anon, authenticated;
revoke all on function public.handle_user_rating_change() from public;
revoke all on function public.handle_user_rating_change() from anon, authenticated;
revoke all on function public.enforce_user_rating_product_id_immutable() from public;
revoke all on function public.enforce_user_rating_product_id_immutable() from anon, authenticated;
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon, authenticated;
revoke all on function public.ensure_rating_aggregate_for_product() from public;
revoke all on function public.ensure_rating_aggregate_for_product() from anon, authenticated;
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
```

## Privileges And Data API Exposure

RLS alone is not enough on newer Supabase projects: tables are not automatically exposed to the Data API. Grant **least-privilege** table access only **after** RLS is enabled and the authorizing policies exist. Without grants, intended public reads can fail before policies run; with grants before policies, clients can be exposed while still open.

Sequencing (required):

1. **Task 11** — create tables/constraints/triggers; `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every exposed table in the same migration (deny-by-default: no client policies yet). Do **not** `GRANT` to `anon` or `authenticated`. Optional `service_role` tooling grants only. Keep aggregate `REVOKE EXECUTE` here.
2. **Task 12** — after Task 11's migration is applied and verified, add a **new** forward-only migration with complete policies; then `GRANT` to `anon` / `authenticated`; then run authorization tests. Do not edit or reuse the Task 11 migration for policies or client grants.

```sql
-- Task 11 (same migration as CREATE TABLE): deny-by-default for API roles.
alter table public.products enable row level security;
-- …enable RLS on every exposed table…
-- no anon/authenticated GRANTs yet

-- Task 12 (separate new migration): policies first, then grants (example).
-- create policy ... on public.products ...;
grant select on public.products to anon, authenticated;
```

Full Task 12 grant set (after policies):

```sql
-- Catalog reads (anon + authenticated). Writes stay off for clients.
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.eazy_assessments to anon, authenticated;
grant select on public.rating_aggregates to anon, authenticated;
grant select on public.product_offers to anon, authenticated;
grant select on public.profiles to anon, authenticated;
-- Column-level only: clients must not rewrite created_at / updated_at.
-- No INSERT grant: profile rows are created by handle_new_user on auth.users insert.
grant update (display_name, username, avatar_url)
on public.profiles to authenticated;

-- My Rating: authenticated owners only (RLS still restricts to own rows).
-- Column-level INSERT/UPDATE so clients cannot set id or timestamps.
grant select, delete on public.user_ratings to authenticated;
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
on public.user_ratings to authenticated;
grant update (
  look,
  comfort,
  quality,
  outfit,
  value,
  overall,
  private_note
)
on public.user_ratings to authenticated;

-- Never grant INSERT/UPDATE/DELETE on rating_aggregates to anon or authenticated.
-- service_role retains full access for admin/seed tooling outside the mobile client.
grant select, insert, update, delete on public.rating_aggregates to service_role;
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.product_images to service_role;
grant select, insert, update, delete on public.eazy_assessments to service_role;
grant select, insert, update, delete on public.product_offers to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.user_ratings to service_role;
```

## Row-Level Security

**Task 11:** enable RLS on every exposed table at creation time (deny-by-default until Task 12 policies exist).

```sql
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.eazy_assessments enable row level security;
alter table public.user_ratings enable row level security;
alter table public.rating_aggregates enable row level security;
alter table public.product_offers enable row level security;
```

**Task 12:** published catalog policies and owner rating policies. Related rows are visible only when their product is published:

```sql
create policy "Public can read published products"
on public.products for select
using (is_published = true);

create policy "Public can read images for published products"
on public.product_images for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_published = true
  )
);

create policy "Public can read current eazy assessments for published products"
on public.eazy_assessments for select
using (
  is_current = true
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.is_published = true
  )
);

create policy "Public can read aggregates for published products"
on public.rating_aggregates for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_published = true
  )
);

create policy "Public can read offers for published products"
on public.product_offers for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_published = true
  )
);
```

User ratings — **owner-only row access** so `private_note` cannot leak. Community Score comes from `rating_aggregates`, not from browsing other users’ rows. `product_id` is immutable (see trigger above). INSERT/UPDATE also require the referenced product to be **published** (FK existence alone does not imply catalog visibility; drafts must not receive client ratings). DELETE stays owner-only so a user can remove an existing rating after a product is unpublished:

```sql
create policy "Users can read own ratings"
on public.user_ratings for select
using (auth.uid() = user_id);

create policy "Users can insert own ratings"
on public.user_ratings for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.is_published = true
  )
);

create policy "Users can update own ratings"
on public.user_ratings for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.is_published = true
  )
);

create policy "Users can delete own ratings"
on public.user_ratings for delete
using (auth.uid() = user_id);
```

Do **not** add a public `SELECT` on `user_ratings` while `private_note` lives on the same row.

`rating_aggregates`: SELECT via grants + published-product policy; no INSERT/UPDATE/DELETE policies for `authenticated` / `anon`. Aggregate writes occur only inside the revoked-from-clients security-definer refresh path (and `service_role` tooling).

Profiles — public read; owner-only update of mutable fields. **No client INSERT policy** (and no `INSERT` grant): each `auth.users` insert creates exactly one `public.profiles` row via `handle_new_user` (Task 11). An UPDATE cannot create a missing profile.

```sql
create policy "Public can read profiles"
on public.profiles for select
using (true);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

### Required authorization scenarios (Task 12)

- Anonymous can read **published** products (and related public catalog joins for those products only).
- Anonymous cannot read unpublished / draft products, their images, offers, assessments, or aggregates.
- Anonymous cannot create ratings.
- User can create / update / delete own rating (`product_id` cannot change on update).
- User cannot insert or update a rating for an **unpublished** product (DELETE of an existing own rating remains allowed).
- User cannot rewrite audit/identity columns (`profiles.created_at` / `updated_at`; `user_ratings.id` / `created_at` / `updated_at`) — column-level grants only; `updated_at` is trigger-maintained.
- Client cannot directly `INSERT` into `profiles` (no grant / no policy); profile rows appear only via the auth.users trigger.
- Authenticated user can update only their own mutable profile fields (`display_name` / `username` / `avatar_url`).
- User cannot read another user’s `private_note` (no cross-user SELECT).
- User cannot modify another user’s rating.
- Client cannot modify `rating_aggregates` (no table write grants; cannot `EXECUTE` refresh helpers via RPC).
- Client cannot mark a purchase as verified (when that column exists).

## Admin Eazy Score Workflow

The app builder needs a way to create Eazy Scores.

MVP options:
- Manually insert `eazy_assessments` rows in Supabase Table Editor.
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
- `rating_aggregates` directly
- `profiles`

Before scraping, confirm source permission, field fit, stable identifiers, and duplicate handling. Use SKU for duplicate detection when available. Track provenance (`source_type`, timestamps, rights).

## Resolved decisions (do not reopen in implementation)

1. Community aggregation mechanism: **resolved** — Task 11 implements trigger-owned `refresh_rating_aggregates` / `handle_user_rating_change`; Task 17 verifies and hardens it (no RPC/schedule re-selection).
2. Primary catalog image: **resolved** — `sort_order ASC`, then `created_at ASC`, then `id ASC`; unique `(product_id, sort_order)`; no images → `imageUrl: null`.
3. Mixed-currency offers for Detail lowest price: **resolved for MVP** — Task 14 requires one currency per product offer payload (reject or omit mismatched offers); raw cross-currency numeric minimum is prohibited. Conversion or per-currency grouping needs a later ADR.

## Unresolved decisions (decide in Task 11 planning; do not invent in code)

1. Product profile: lookup table (recommended), enum, or checked text?
2. Intended use: join table (recommended) vs validated array?
3. Assessment history: versioned with one `is_current` (recommended) vs overwrite-only?
4. Offers: current offer rows first (recommended); price snapshots later.
5. `private_note` limit: 500 characters (recommended).
6. Seed images: Storage upload vs keep mock-image resolution until catalog ingestion.
7. Auth methods: email first (recommended) unless Apple is required for the next TestFlight.
