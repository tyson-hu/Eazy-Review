---
id: decision-curated-feed-collections
date: 2026-09-03
updated: 2026-09-05
status: accepted
area: architecture
tasks: [21]
pr: 52
tags: [catalog, discovery, feed, supabase]
supersedes: [decision-real-feed-mvp-sections]
---

# Merge code-owned auto sections with row-owned curated collections on Feed

## Context

The Task 21 Feed derives three sections (Newly Added, Best Eazy Scores, Most
Rated) on the client from the one shared published-catalog query. Every
section is framed by Eazy Score or Community Score, and the 2026-09-02 decision
forbade a feed-configuration table and a Feed query key so the MVP Feed could
not grow into a CMS. The product owner now wants the Feed to carry other
perspectives over time — brand series, hand-picked collections, rankings that
a human orders, and later a real trend signal — without redesigning the Feed
or building an admin dashboard (still excluded by `docs/BLUEBOOK.md`). The
Feed therefore needs one durable rule for which sections are owned by code,
which are owned by rows in Supabase, how the two interleave, and how a human
edits the row-owned ones today.

## Decision

Feed sections have two owners and one presentation contract.

**Code owns auto sections.** Each auto section is one registered source
(id, fixed position, and a pure `build(products)` function) over the shared
`ProductCardData[]`. The three current sources keep their rules: Newly Added
(position 100, reverse catalog order, unranked, at least one product), Best
Eazy Scores (position 200, ranked by Eazy Score), and Most Rated (position
300, ranked by `ratingCount`, Community Score shown). Ranked auto sections
require at least two qualifying products. Future computed perspectives — Best
Community Scores, a brand ranking, a trend ranking once a real time-based
activity signal exists — are added as new sources, never as rows.

**Rows own curated collections.** Two tables hold human-curated
"series / collection / ranking" content:

- `product_collections`: `id`, unique lowercase `slug`, `title`, `caption`
  (the one-line ordering basis), `lead_label` (spotlight eyebrow), `signal`
  (`eazy` | `community`, default `eazy`), `is_ranked` (default `false`,
  because editorial order is not a measured rank), nullable
  `feed_position` (null means not shown on Feed), `is_published` (default
  `false`), and `created_at` / `updated_at` with the shared
  `set_updated_at` trigger. A partial unique index on `feed_position` for
  published Feed rows prevents two live collections from claiming one slot.
- `product_collection_items`: `collection_id` and `product_id` foreign keys
  (cascade on delete), `position`, unique on `(collection_id, product_id)`
  and on `(collection_id, position)`.

Collections store product ids only — no denormalized product fields. The
Feed resolves ids against the already-loaded published catalog, so an
unpublished or missing product silently drops out of every collection and the
app keeps one card query and one card adapter. A curated caption must state
that the list is hand-picked (for example `Picked by Eazy Review`); it may not
claim a measured basis such as `Ranked by Eazy Score` or `Trending`.

**Access.** RLS is enabled at table creation and denies by default.
`anon` and `authenticated` receive `SELECT` only: collections where
`is_published = true`, and items whose parent collection is published.
Product publish state is enforced by the existing `products` policy at
resolution time. `service_role` keeps full DML. No client write path, no RPC,
no rule engine in the database.

**Editing path.** Humans create and edit collections the same way they create
Eazy assessments: SQL, Supabase Studio, or seed on local and approved staging;
production edits remain a human-only manual step. `supabase/seed.sql` carries
at least one example collection in the same idempotent insert-if-absent style
so the local Feed shows a curated section and evidence can be captured.

**Merge.** The client fetches collections with one small nested select
(published, `feed_position` not null, items ordered by position) under a new
public catalog query key. Each collection becomes a section at its
`feed_position`; ranked collections need at least two resolved products,
unranked need one; every section caps at five products. Auto and curated
sections sort by position (tie: curated first, then id); a later section
whose ordered product ids equal an earlier visible section is hidden. The
first populated section still supplies the spotlight, so a collection placed
before position 100 leads the Feed with its own eyebrow.

**Screen behavior.** The products query drives every full-screen state as
before. The initial loading state also waits for the collections request when
it has no cached data, so a curated section never pops in above the spotlight
after first paint. If collections fail or the device is offline with nothing
cached, the Feed renders auto sections only, with no extra banner; retry
refetches both. `ProductSpotlightCard` and `ProductRankRow` are unchanged.

This decision supersedes the "no feed-configuration table" and "no Feed query
key" clauses of `decision-real-feed-mvp-sections` and restates the rules it
retains (three auto sections, min-two ranked threshold, five-item cap,
duplicate-hide, Most Rated by count, no Trending without a real signal).

## Consequences

- Adding a computed perspective is one source entry with unit tests; adding an
  editorial perspective is one row plus items, with no deploy.
- Curated content can never leak an unpublished product, because cards come
  from the published catalog. The client replaces a curated caption that
  claims a measured basis or does not say the list is hand-picked with
  `Picked by Eazy Review`.
- The Feed makes two requests instead of one; the second is a few hundred
  bytes and shares the catalog cache lifecycle.
- The seed and staging databases become the editorial workspace until Task 28
  provides reviewed admin tooling; there is no in-app editor.
- Collections may hold more than five items, but Feed shows only the first
  five; a "See all" surface does not exist yet.
- `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `docs/USER_FLOWS.md`,
  `docs/DESIGN.md`, `docs/TASKS.md`, and `docs/BLUEBOOK.md` must drop the
  feed-configuration-table prohibition and describe curated sections.

## Revisit when

A collection needs more than five visible products (a "See all" route), a
real time-based activity signal makes a trend source honest, a brand or
category ranking is requested, Task 28 introduces reviewed admin tooling that
should own collection edits, a measured Task 20 trigger moves ranking
server-side, or curated content needs scheduling (start and end dates) or
localization.

## Related

- `docs/decisions/2026-09-02-real-feed-mvp-sections.md`
- `docs/decisions/2026-09-03-feed-scoreboard-layout.md`
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/USER_FLOWS.md`
- `docs/DESIGN.md`
- `docs/TASKS.md`
- `docs/BLUEBOOK.md`
