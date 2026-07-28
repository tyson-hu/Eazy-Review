# Eazy Review Data Model

Use relational Supabase/PostgreSQL tables. Do not store product identity,
images, offers, ratings, and summaries inside one giant product JSON object.

This document is the canonical contract for Tasks 11–12. Task 11 has three
forward-only migrations under `supabase/migrations/`: core
tables/triggers/RLS, complete internal-helper `EXECUTE` revocation, and
statement-level aggregate refresh that prevents multi-product lock inversion.
No migration adds client policies or positive grants. The local clean-reset
gate is 180 pgTAP assertions plus same-product insert and multi-product delete
concurrency races. The first two migrations passed explicitly authorized
staging acceptance on 2026-07-28; the third is locally verified and pending
staging parity/re-acceptance. Task 12 remains pending. Production was not
touched.

Separate these concerns:

| Concern | Tables | Meaning |
| --- | --- | --- |
| Product facts | `products`, `product_images`, `product_offers` | Brand, model, SKU, release, images, and offers |
| Editorial assessment | `eazy_assessments` | Versioned app-builder Eazy Score |
| Community evidence | `user_ratings`, `rating_aggregates` | Personal scores plus owner-only note; server-owned Community Score |

UI names remain `Eazy Score`, `Community Score`, and `My Rating`.

## Task 11 Core Tables

- `profiles`: public profile fields; one row per `auth.users` row, created by a
  trusted trigger rather than a client insert.
- `products`: catalog identity; `is_published` gates all anonymous catalog
  access.
- `product_images`: ordered images; unique `(product_id, sort_order)` makes the
  primary-image choice deterministic.
- `eazy_assessments`: versioned editorial Eazy Score rows; at most one current
  assessment per product.
- `user_ratings`: one owner-only rating per user/product; identity is immutable
  after insert.
- `rating_aggregates`: server-owned Community Score and category averages.
- `product_offers`: current purchase offers with constrained size, region,
  currency, and price values.

Names `official_ratings` and `product_rating_summary` are obsolete planning
names. Do not introduce them in migrations.

## Rating Categories

My Rating fields:

- `look`
- `comfort`
- `quality`
- `outfit`
- `value`
- `overall`
- `private_note` (optional, owner-only, maximum 500 characters)

`private_note` is not a public review. Keep the mock UI's existing `comment`
field until Task 16 owns the connected rename.

Eazy Score assessment fields:

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
- `score` (0–100)

Use `comfort`, not `comforts`; `maintenance`, not `maintain`; `value` or
`resale_markup`, not `markups`; and `details` or `craftsmanship`, not
`meticulous`.

## Task 11 Schema Contract

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
```

Task 14 will select the primary image by `sort_order ASC`, then
`created_at ASC`, then `id ASC`. No image maps to `imageUrl: null`.

MVP offer rows accept `US` and `USD` only. Seed/import code must trim and
uppercase those values before insert. Expand either whitelist deliberately when
another sizing system or ISO 4217 currency is supported; never calculate a raw
minimum across mixed currencies.

## Task 11 Trigger And Function Acceptance

The client never calculates or persists Community Score. Task 11 owns a
trigger-based, server-side aggregate mechanism with these acceptance criteria:

- `rating_count` is the number of ratings for the product.
- Each category average and `overall_avg` is the arithmetic mean of the
  matching 1–10 rating column, rounded to two decimal places.
- `score` is `round(avg(overall) * 10)` as an integer from 0–100. Calculate it
  from the unrounded arithmetic mean, not from the stored two-decimal
  `overall_avg`.
- A zero-count aggregate keeps every category average, `overall_avg`, and
  `score` null.
- A product insert creates one zero-count `rating_aggregates` row.
- Rating insert, score update, and delete refresh the matching product's count,
  category averages, overall average, score, and timestamp.
- Refreshes for the same product are serialized before reading
  `user_ratings`, so concurrent commits cannot leave a stale aggregate.
- Rating insert, update, and delete refresh once per statement from transition
  tables. Distinct affected product IDs are processed in stable UUID order so
  one multi-product statement cannot invert transaction advisory locks against
  another.
- Deleting the last rating leaves the existing product with a zero-count row
  and null averages/score.
- `product_id` and `user_id` on `user_ratings` cannot change after insert.
- Deleting a product and its cascaded ratings/aggregate completes without
  attempting to recreate an aggregate for the deleting/deleted product and
  without an FK error.
- The mechanism is tested locally for insert/update/delete, last-rating
  removal, same-product concurrency, multi-product delete concurrency, and
  product deletion before Task 11 is called complete.
  `supabase/tests/database/aggregates.test.sql` covers the aggregate cases and
  retains a structural advisory-lock guard; `scripts/test-db-concurrency.cjs`
  proves a same-product writer waits and sees both commits, then overlaps two
  user-deletion cascades across two products and verifies both complete with
  zeroed aggregates. Local suite pass: 2026-07-28.
- A fixed-value fixture with category/overall tuples
  `(10, 8, 6, 4, 2, 1)` and `(2, 4, 6, 8, 10, 10)` must produce `6.00` for
  every category average, `overall_avg = 5.50`, and `score = 55`.
- A rounding-boundary fixture with four overall values `1, 1, 1, 2` must
  produce `overall_avg = 1.25` and `score = 13`, and removing all four ratings
  must restore the zero-count/null state.

Expected names are `refresh_rating_aggregates`,
`handle_user_rating_change`, and the three event-specific statement triggers:
`user_ratings_refresh_aggregates_insert_trigger`,
`user_ratings_refresh_aggregates_update_trigger`, and
`user_ratings_refresh_aggregates_delete_trigger`. Exact function SQL lives in
the Task 11 migrations and is deliberately not duplicated here.

`handle_new_user` runs after `auth.users` insert and inserts only
`public.profiles (id)`. It must produce exactly one profile row and clients
never receive profile `INSERT`.

`handle_new_user` and `handle_user_rating_change` are the required trigger-only
`SECURITY DEFINER` entrypoints: the former crosses from `auth.users` to
`public.profiles`, and the latter owns the aggregate-write privilege boundary
for the three statement triggers. An inner `refresh_rating_aggregates` helper
may remain `SECURITY INVOKER` because it executes inside the secured trigger
entrypoint. Server-maintained timestamp and rating-identity helpers remain
`SECURITY INVOKER` unless their implementation proves that elevation is
required. A `BEFORE UPDATE` trigger rejects changes to both rating identity
columns.

Every Task 11 public-schema function is internal to a trigger path and must
revoke `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`. In addition, every
`SECURITY DEFINER` helper, including both required entrypoints, must:

- declare `SET search_path = ''`;
- fully qualify every relation;
- expose no Data API RPC path to client roles.

Supabase's current function guidance explains both the empty-search-path rule
and default function execution privileges:
[Database Functions](https://supabase.com/docs/guides/database/functions).

## Task 11 Deny-By-Default Boundary

Task 11 enables RLS as each exposed table is created:

```sql
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.eazy_assessments enable row level security;
alter table public.user_ratings enable row level security;
alter table public.rating_aggregates enable row level security;
alter table public.product_offers enable row level security;
```

Task 11 explicitly revokes all table privileges from `PUBLIC`, `anon`, and
`authenticated` on each new exposed table, then adds no client policies or
positive client grants. Revoking only the named login roles is insufficient
because privileges inherited through `PUBLIC` are effective privileges. This
keeps deny-by-default behavior independent of the project's inherited
defaults. Optional explicit `service_role` grants are only for trusted
staging/seed tooling and never place a service-role key in Expo.

Packet 6 SQL tests under `supabase/tests/database/security.test.sql` assert
these effective table privileges, zero policies, and denied execution across
all six internal helpers. The current 180-assertion pgTAP suite and both
concurrency races passed locally on 2026-07-28. Historical staging verification
of the first two migrations on 2026-07-28 confirmed 7/7 tables with RLS, zero
policies, zero prohibited table privileges, all six internal helpers with zero
prohibited executions, both required `SECURITY DEFINER` functions, nine
then-expected triggers, and seven transaction-rolled-back profile/aggregate
behavior checks with no fixture residue. The third migration still needs
staging parity/re-acceptance.

## Task 12 Privileges And Data API Exposure

Data API grants and RLS are separate layers: grants decide whether a role can
reach an object; policies decide which rows that role may use. Supabase began
making explicit opt-in grants the default for new projects on May 30, 2026,
with enforcement for existing projects scheduled for October 30, 2026, so the
migration must not depend on either old or new project defaults:
[Securing your API](https://supabase.com/docs/guides/api/securing-your-api) and
[the 2026 default-grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Task 12 is a new forward-only migration after Task 11 is accepted:

1. Create the complete policies below.
2. `REVOKE ALL PRIVILEGES` on every listed table from `PUBLIC`, `anon`, and
   `authenticated`; PostgreSQL privileges are additive, privileges inherited
   through `PUBLIC` are effective, and a later column grant does not cancel an
   inherited table-wide grant.
3. Rebuild this explicit allowlist.
4. Run privilege-inventory and authorization tests.

| Relation | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| `products` | `SELECT` | `SELECT` | `SELECT, INSERT, UPDATE, DELETE` |
| `product_images` | `SELECT` | `SELECT` | `SELECT, INSERT, UPDATE, DELETE` |
| `eazy_assessments` | `SELECT` | `SELECT` | `SELECT, INSERT, UPDATE, DELETE` |
| `rating_aggregates` | `SELECT` | `SELECT` only | `SELECT, INSERT, UPDATE, DELETE` |
| `product_offers` | `SELECT` | `SELECT` | `SELECT, INSERT, UPDATE, DELETE` |
| `profiles` | `SELECT` | `SELECT`; `UPDATE (display_name, username, avatar_url)` | `SELECT, INSERT, UPDATE, DELETE` |
| `user_ratings` | none | `SELECT, DELETE`; column-level `INSERT` / `UPDATE` below | `SELECT, INSERT, UPDATE, DELETE` |

Authenticated `user_ratings` column privileges:

- `INSERT`: `product_id`, `user_id`, `look`, `comfort`, `quality`, `outfit`,
  `value`, `overall`, `private_note`.
- `UPDATE`: `look`, `comfort`, `quality`, `outfit`, `value`, `overall`,
  `private_note`.
- Never grant client writes to `id`, `product_id` on update, `user_id` on
  update, `created_at`, or `updated_at`.

No client role receives profile `INSERT`, aggregate writes, or `EXECUTE` on
trigger-only helpers.

Privilege inventory must assert effective privileges with
`has_table_privilege` and `has_column_privilege`, not only inspect direct grant
rows. It must prove `PUBLIC` contributes no access, `anon` / `authenticated`
match the client allowlist exactly, and `service_role` has every table
privilege in the matrix above after the rebuild.

## Task 12 Row-Level Security

Policies must use explicit target roles and enforce:

| Relation / operation | Policy contract |
| --- | --- |
| `products SELECT` | Only `is_published = true` |
| Related catalog `SELECT` | Image, current Eazy assessment, aggregate, or offer is visible only when its product is published; assessments also require `is_current = true` |
| `profiles SELECT` | Public |
| `profiles UPDATE` | Authenticated owner only (`auth.uid() = id`) with the same ownership check after update |
| `user_ratings SELECT` | Authenticated owner only; raw ratings are not community content |
| `user_ratings INSERT` | `auth.uid() = user_id` and referenced product is published |
| `user_ratings UPDATE` | Existing owner and resulting owner both match `auth.uid()`; referenced product is published |
| `user_ratings DELETE` | Existing owner only, including after product unpublish |
| `rating_aggregates` writes | No client policy |

Keep `private_note` on the owner-only row. Community Score reads come from
`rating_aggregates`; do not add a public `user_ratings SELECT` policy.

### Required Authorization Scenarios

- Anonymous can read published products and only their related catalog rows.
- Anonymous cannot read drafts or create ratings.
- An authenticated user can read/create/update/delete only their own rating.
- Insert/update against an unpublished product fails; owner delete still works.
- Rating identity and audit columns cannot be rewritten through the Data API.
- Clients cannot insert arbitrary profiles; an owner can update only mutable
  fields on their own profile.
- One user cannot read another user's `private_note` or modify that rating.
- Clients cannot write `rating_aggregates` or execute refresh helpers.
- Privilege inventory proves no table-wide profile/rating write grant survived
  the revoke-and-allowlist sequence, including access inherited through
  `PUBLIC`.
- A missing intended grant fails before RLS, proving both controls were tested.
- A trusted server-only `service_role` connection can perform every operation
  in its allowlist, including rating insert/update/delete with the expected
  aggregate trigger side effects. The service-role secret is never used by or
  bundled into Expo.

## Task 15 Account-Deletion Consequences

Task 15's protected self-deletion path hard-deletes only the verified current
`auth.users` caller. The caller id is derived server-side from verified auth,
never trusted from a request body. Before deletion, the server revokes all of
that user's refresh sessions.

The existing foreign keys define the data lifecycle:

- `profiles.id on delete cascade` removes the profile. MVP retains no
  display-name, username, or avatar-url copy.
- `user_ratings.user_id on delete cascade` removes every My Rating row,
  including `private_note`.
- Each cascaded rating delete must execute the Task 11 aggregate-refresh path.
  Product rows and `rating_aggregates` are retained and recomputed; a product
  whose last rating was removed returns to count `0` with null averages/score.

The human-run local/staging deletion checklist covers a user who rated multiple
products and a user who shares a product with another rater. It proves
profile/rating removal, correct retained aggregates, no orphan rows, and no
stale Community Score. Coding agents may prepare this checklist and
non-destructively validate the implementation, but they never execute an
account deletion under Task 15's acceptance boundary in `docs/TASKS.md`.

## Admin Eazy Score Workflow

For MVP, create Eazy assessments through trusted staging/admin tooling or seed
SQL. Do not build an admin dashboard first. Publishing a replacement assessment
must retire the prior current row and create the new current row atomically.

## Import Rules

Do not implement scraping until the app core works. Importing may populate
`products`, `product_images`, and `product_offers` through trusted tooling. It
must not write `user_ratings`, write
`rating_aggregates` directly, or create `profiles`.

Before importing, confirm source permission, field fit, stable identifiers, and
duplicate handling. Use SKU for duplicate detection when available.
