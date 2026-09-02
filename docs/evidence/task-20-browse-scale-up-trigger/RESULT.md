# Task 20 — Browse Scale-Up Trigger Evaluation

## Status

**Trigger evaluated on 2026-09-02 — no triggering criterion recorded as met
(catalog size and Browse payload: not met; latency / UI: not evaluated).**
Task 20 remains Conditional. Evaluation human accepted in PR #49 on
2026-09-02. No Browse Scale-Up implementation was authorized or started.

## Environment

| Item | Value |
| --- | --- |
| Date | 2026-09-02 |
| Repository SHA at measurement | `0ef13e0` (`master`) |
| Database | Local Docker Supabase only (`supabase_db_eazy-review`) |
| Hosted / production | Not touched |
| Staging catalog size | Cited from S2 / Task 15 evidence: two published staging-only fixtures observed on cold iOS staging-backed walks (2026-08-31 / 2026-09-01); not re-measured in this run |
| App code changed | None |

## Catalog size and footprint (local)

| Metric | Result |
| --- | --- |
| `products` total | 2 |
| `products` published | 2 |
| `product_images` | 1 |
| `product_offers` | 2 |
| `eazy_assessments` | 1 |
| `rating_aggregates` | 2 |

Relation total sizes (`pg_total_relation_size`):

| Relation | Size |
| --- | --- |
| `products` | 120 kB |
| `product_offers` | 80 kB |
| `eazy_assessments` | 48 kB |
| `product_images` | 48 kB |
| `rating_aggregates` | 32 kB |

Existing `products` indexes (present, unused by the client Browse path):
`products_pkey`, `products_sku_key`, `products_brand_idx`,
`products_created_at_idx`, `products_name_idx` (GIN FTS on `name`),
`products_published_idx`.

## Browse wire payload and latency (local REST)

Exact `getProducts` select/filters/orders from
`src/features/products/api.ts`, issued as anonymous PostgREST against the
local stack (10 runs; first run cold).

| Metric | Result |
| --- | --- |
| Rows returned | 2 |
| Response bytes (stable) | 1,398 |
| Bytes per published product | 699 |
| Min / median / max latency | 4.44 ms / 5.93 ms / 43.95 ms |
| Projected payload at 300 products | ~210 KB |
| Projected payload at 1,000 products | ~699 KB |

Caveat: the two-row catalog mixes one complete fixture and one sparse
fixture, so bytes-per-product is an average, not a worst-case complete row.

## Query plans (local `EXPLAIN ANALYZE, BUFFERS`)

1. **Published base scan** ordered `created_at, id`: Seq Scan + Sort;
   actual rows 2; execution ~0.05 ms. Planner estimates ~180 rows and does
   not use `products_published_idx` at this scale.
2. **Candidate `ilike` search** across brand / name / sku (`%nike%`): Seq
   Scan; actual rows 1; execution ~0.06 ms. Brand btree unused.
3. **Candidate FTS** `to_tsvector('english', name) @@ plainto_tsquery(...)`:
   Bitmap Index Scan on `products_name_idx`; actual rows 1; execution
   ~0.09 ms. The GIN index is usable but irrelevant at two rows.

## Client-side `matchesQuery` micro-bench

Pure in-memory copy of Browse's `matchesQuery` (no DB, no React render),
1,000 iterations, query `"nike"`:

| Catalog size | Matched | Per-call ms |
| --- | --- | --- |
| 2 | 1 | 0.0004 |
| 100 | 15 | 0.0086 |
| 1,000 | 143 | 0.0645 |
| 10,000 | 1,429 | 0.6444 |

Filter alone stays under 1 ms even at 10,000 items. The practical UI bound
at scale is eager `.map` rendering of every card in a ScrollView, not the
string filter.

## Criteria check

Against
[`docs/decisions/2026-09-02-browse-scale-up-trigger.md`](../../decisions/2026-09-02-browse-scale-up-trigger.md):

| Criterion | Threshold | Observed / projected | Met? |
| --- | --- | --- | --- |
| Catalog size | ≥ 300 published (measured) | 2 local; 2 staging (cited) | No |
| Browse payload | ≥ 1 MB measured or projected | 1,398 B; ~210 KB at 300 | No |
| Latency / UI | ≥ 2 s device median, or filter+render ≥ ~50 ms | Local REST median ~6 ms only; physical staging Browse median and on-device filter+render **not measured** this run. Filter-alone micro-bench ≪ 50 ms through 10k is insufficient for this criterion | Not evaluated |

**Verdict: no triggering criterion recorded as met.** Catalog size and Browse
payload fail on evidence. Latency / UI is inconclusive because neither required
measurement was performed; an unevaluated criterion cannot authorize Task 20
and also must not be reported as a measured miss. Keep client-side
brand/name/SKU search. Do not start server-side search, sort, filters,
pagination, or index-change work.

## Skipped (with reason)

| Item | Reason |
| --- | --- |
| Physical-device Browse latency against staging | Out of scope for this docs-only evaluation; criterion 3 therefore stays **Not evaluated**, not `No` |
| On-device filter+render timing | Same; filter-alone micro-bench is supporting context only |
| Hosted staging SQL count | Agents must not treat staging DB inspection as routine for this docs packet; S2/Task 15 evidence already records two published fixtures |
| Synthetic multi-thousand seed | Explicitly out of scope for trigger evaluation; projection used instead |
| `npm test` / Expo / database suites | No application, Edge Function, or database code changed |

## Method notes for re-measurement

1. Capture local Supabase env with `DO_NOT_TRACK=1 supabase status -o env`
   into a temp file; never print or shell-source it. Prefer the stack's
   publishable client key for anonymous REST when the legacy JWT anon key
   is rejected (`PGRST301`).
2. Count and size via local Postgres (`docker exec` into
   `supabase_db_eazy-review` when host `psql` is absent).
3. Measure Browse bytes/latency with a temp Node script that issues the
   current `BROWSE_SELECT` shape over PostgREST and records
   `arrayBuffer().byteLength`.
4. Run `/tmp/explain.sql`-style `EXPLAIN (ANALYZE, BUFFERS)` for the base
   scan and candidate search shapes.
5. Run an in-memory `matchesQuery` bench at 2 / 100 / 1,000 / 10,000.
6. Delete all temp artifacts afterward.
