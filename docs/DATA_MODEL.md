# Eazy Review Data Model

Use relational Supabase/PostgreSQL tables. Do not store product identity,
images, offers, ratings, and summaries inside one giant product JSON object.

This document is the canonical current contract for product/rating tables,
triggers, RLS, grants, and authorization behavior. Tasks 11–12 applied
migrations remain historical and forward-only (never rewritten). Task 17’s
forward migration brings ratings onto the shared **sneaker-10-v1** rubric.
Dated Task 11–12 acceptance is preserved in
[`docs/evidence/task-11-12-database-acceptance/RESULT.md`](evidence/task-11-12-database-acceptance/RESULT.md).

Separate these concerns:

| Concern | Tables | Meaning |
| --- | --- | --- |
| Product facts | `products`, `product_images`, `product_offers` | Brand, model, SKU, release, images, and offers |
| Editorial assessment | `eazy_assessments` | Versioned app-builder Eazy Score |
| Community evidence | `user_ratings`, `rating_aggregates` | Personal scores plus owner-only note; server-owned Community Score |

UI names remain `Eazy Score`, `Community Score`, and `My Rating`.

## Task 11 Core Tables

- `profiles`: owner-readable profile fields; one row per `auth.users` row,
  created by a trusted trigger rather than a client insert.
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

Eazy, Community, and My Rating share one **sneaker-10-v1** rubric.

Dimension fields (0–10, half-step increments, 0 is a valid score, null only when
unanswered on draft forms — stored rows require all ten):

1. `look` — UI: Appearance
2. `outfit` — UI: Styling
3. `material` — UI: Materials
4. `craftsmanship` — UI: Craftsmanship
5. `maintenance` — UI: Care (10 = easy to maintain)
6. `comfort` — UI: Comfort
7. `collection` — UI: Collectibility
8. `value` — UI: Product Value (10 = strong value relative to execution, price, concept)
9. `resale_potential` — TypeScript: `resalePotential` — UI: Resale Potential
   (10 = strong retention/upside)
10. `acquisition_ease` — TypeScript: `acquisitionEase` — UI: Acquisition Ease
    (10 = easy/reasonable to obtain)

`private_note` remains optional, owner-only, maximum 500 characters.

Composite fields (0–100, never client-entered):

- `eazy_assessments.score` and `user_ratings.score` (My Rating)
- `rating_aggregates.score` (Community Score)

```
composite = round(
  look + outfit + material + craftsmanship + maintenance
  + comfort + collection + value + resale_potential + acquisition_ease
)
```

Equal weight for all dimensions. Methodology version `methodology_version` is
`sneaker-10-v1`. Aggregates only include ratings with that version.

For complete `eazy_assessments` rows the derive trigger **always** forces
`methodology_version = 'sneaker-10-v1'` and recomputes `score` from dimensions
(same force pattern as `user_ratings`). Incomplete editorial rows store
`score = null` so a partially cleared dimension set cannot keep a stale
composite.

Retired (superseded after Task 17 physical-device defects):

- Manually entered `overall`
- User-only `quality` and eazy-only `details` under the old unequal models

## Task 11 Schema Contract

The Tasks 11–12 applied migrations remain historical. For the current rating
shape (Task 17 forward migration), the effective columns are:

**`eazy_assessments`:** ten dimensions (nullable at rest for incomplete
editorial rows), derived `score` 0–100, `methodology_version`, `is_current`,
timestamps, partial unique one-current-per-product.

**`user_ratings`:** ten required dimensions, derived `score`,
`methodology_version` not-null default/constraint `sneaker-10-v1`, optional
`private_note`, unique `(product_id, user_id)`, immutable identity.

**`rating_aggregates`:** `rating_count`, ten `*_avg` columns numeric(4,2),
derived `score` 0–100, `methodology_version`, `updated_at`.

Client Data API grants for ratings write only the dimensions + `private_note`
(not `score`, not `methodology_version`, never aggregates).

## Task 11 Trigger And Function Acceptance

The client never calculates or persists Community Score. Acceptance criteria
under sneaker-10-v1:

- `rating_count` is the number of methodology-compatible ratings for the product.
- Each dimension average is `round(avg(dim), 2)`.
- Community Score is
  `round(avg(look)+…+avg(acquisition_ease))` from unrounded means (mirrors Eazy
  composite derivation).
- Zero-count aggregates keep averages, score, and methodology_version null.
- Product insert still creates one zero-count aggregate row.
- Rating insert/update/delete refresh aggregates; concurrent same-product writes
  remain serialized via 64-bit advisory locks.
- Identity columns on `user_ratings` remain immutable after insert.

### Aggregate fixtures (sneaker-10-v1)

- A single rating with all ten dimensions = 8 yields averages 8.00 and score 80.
- Four ratings with three full-1.0 and one full-2.0 sets yield each avg 1.25 and
  Community Score 13.
- Two complementary ratings with per-dimension pairs averaging 6.00 yield score
  60.

Expected names remain `refresh_rating_aggregates`,
`handle_user_rating_change`, and the statement triggers. Composite derivation
uses `derive_user_rating_composite` / `derive_eazy_assessment_composite`
(SECURITY DEFINER, non-executable by clients).

```sql
-- Historical Task 11 SQL lives in applied migrations and is not re-duplicated
-- here. Current column lists are described in prose above and enforced by the
-- Task 17 forward migration.
```

Task 15 selects the primary image by `sort_order ASC`, then
`created_at ASC`, then `id ASC`. No image maps to `imageUrl: null`.

MVP offer rows accept `US` and `USD` only. Seed/import code must trim and
uppercase those values before insert. Expand either whitelist deliberately when
another sizing system or ISO 4217 currency is supported; never calculate a raw
minimum across mixed currencies.

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

The SQL tests under `supabase/tests/database/security.test.sql` assert these
effective table privileges, zero policies, and denied execution across all six
internal helpers. The database harness also proves statement-trigger shape,
actual 64-bit lock-key ordering, concurrency behavior, and zero fixture
residue. Accepted local and staging results live in the historical evidence
record linked at the top of this document.

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
| `profiles` | none | `SELECT`; `UPDATE (display_name, username, avatar_url)` | `SELECT, INSERT, UPDATE, DELETE` |
| `user_ratings` | none | `SELECT, DELETE`; column-level `INSERT` / `UPDATE` below | `SELECT, INSERT, UPDATE, DELETE` |

Authenticated `user_ratings` column privileges (after Task 17
`sneaker-10-v1` migration):

- `INSERT`: `product_id`, `user_id`, the ten dimension columns
  (`look`, `outfit`, `material`, `craftsmanship`, `maintenance`, `comfort`,
  `collection`, `value`, `resale_potential`, `acquisition_ease`), and
  `private_note`.
- `UPDATE`: the same ten dimensions and `private_note`.
- Never grant client writes to `score`, `methodology_version`, `id`,
  `product_id` on update, `user_id` on update, `created_at`, or `updated_at`.

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
| `profiles SELECT` | Authenticated owner only (`auth.uid() = id`); anonymous users receive no profile grant or policy |
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
- Anonymous cannot read drafts, profiles, or raw ratings and cannot create
  ratings.
- An authenticated user can read/create/update/delete only their own rating.
- An authenticated user can read only their own profile.
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

The accepted forward-only Task 12 migration implements this policy/grant
contract after the Task 11 schema migrations. The migration itself added no
application runtime integration. Task 14 provides the shared Expo Supabase
client and TanStack Query foundations. Tasks 15–18 use the client for connected
catalog reads, authentication, durable ratings/Rated Products, and password
recovery. TanStack Query manages connected query state and connectivity
lifecycle where applicable. Exact local and staging acceptance results,
including the hosted-test fallback and production boundary, live in the
historical evidence record linked at the top.

## Task 19 Account-Deletion Consequences

Task 19's protected self-deletion path hard-deletes only the verified current
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
account deletion under Task 19's acceptance boundary in `docs/TASKS.md`.

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
