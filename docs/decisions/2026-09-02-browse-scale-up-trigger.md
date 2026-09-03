---
id: decision-browse-scale-up-trigger
date: 2026-09-02
status: accepted
updated: 2026-09-02
area: architecture
tasks: [20]
pr: 49
tags: [browse, catalog, performance, trigger]
supersedes: []
---

# Record numeric Browse Scale-Up trigger criteria

## Context

Task 20 (Browse Scale-Up) is conditional: server-side brand/name/SKU search,
sorting, filters, and pagination may ship only after a human/parent records a
measured scaling need. Until 2026-09-02 no ADR fixed a numeric threshold, so
"measured need" was undefined and agents could not tell implement from park.
Browse today fetches every published product once
(`src/features/products/api.ts` `getProducts`) and filters brand/name/SKU
client-side (`app/(tabs)/browse.tsx` `matchesQuery`). When this decision was
recorded, the local seed and the last observed staging catalog each exposed
two published products. PR #50 later grew the published seed to 27 products;
that load is a reason to re-measure, not a change to these criteria.
Existing indexes (`products_brand_idx`, GIN `products_name_idx`) are unused
by the client.

## Decision

Task 20 implementation starts only when a human/parent records in
`docs/TASKS.md` that **any one** of these criteria is met:

1. **Catalog size.** Published catalog ≥ 300 products (measured count on
   local or approved staging — never production).
2. **Browse payload.** Measured or projected Browse single-request payload ≥
   1 MB, where projection = measured bytes per published product × published
   count for the same `BROWSE_SELECT` shape.
3. **Latency / UI.** Browse full-catalog request median ≥ 2 s on a physical
   device over Wi‑Fi against staging, **or** one search keystroke's
   filter+render exceeds ~50 ms on device (filter alone is not enough —
   eager `.map` rendering in a ScrollView is the practical UI bound).

Until one criterion is recorded as met, keep client-side search over the
small catalog. Do not ship Filter/Sort/pagination placeholders. A scheduled
seed or Task 28 import is a reason to **re-measure** after the load lands; it
does not by itself authorize Task 20.

**Who records.** The human or parent writes the trigger result into Task 20's
`Status` / `Human gate` in `docs/TASKS.md` and points at evidence under
`docs/evidence/`. Board card `T20` follows the ledger
(`docs/DOCUMENTATION_POLICY.md`, GitHub Project #4 Mirror).

**How to re-measure.** Repeat the read-only local procedure used on
2026-09-02 (see
`docs/evidence/task-20-browse-scale-up-trigger/RESULT.md`): catalog
counts/sizes via local Postgres; Browse wire bytes and latency for the exact
`getProducts` select/filters/orders; `EXPLAIN (ANALYZE, BUFFERS)` for the
published base scan and for candidate `ilike` / FTS search shapes; an
in-memory `matchesQuery` micro-bench at 2 / 100 / 1,000 / 10,000 items.
Staging/device latency criteria require an approved staging or physical run —
never production DB reads.

## Consequences

- Agents have a pass/fail rule instead of an open-ended judgment call.
- At the 2026-09-02 two-product evaluation, catalog size and Browse payload
  criteria are not met (2 published products, ~699 B/product). Latency / UI
  was not measured on device, so it is inconclusive and does not authorize
  Scale-Up. No triggering criterion is recorded as met; Task 20 stays
  Conditional and Task 21 is the next Revised Sequence item to select.
- Re-measured on 2026-09-02 after PR #50 (27 published products). Catalog
  size and Browse payload remain unmet (32,747 B Browse payload, ~1,213
  B/product, ~364 KB projected at 300). Latency / UI still not evaluated on
  device. Criteria unchanged. Evidence:
  `docs/evidence/task-20-browse-scale-up-trigger/RESULT.md`.
- Index and schema work for Task 20 remain a separately authorized
  `supabase-schema-change` packet after the trigger is recorded as met.
- Criteria may be tightened or relaxed at PR review when new evidence lands;
  changing the numbers is a revision of this decision, not an ad hoc note.

## Revisit when

Any seed or import changes the published catalog size; before Task 22 fixes
its cross-feature test scope; when a physical-device Browse median against
staging is first measured; or when projected payload at the planned catalog
size crosses 1 MB.

## Related

- `docs/TASKS.md` (Task 20)
- `docs/API_CONTRACTS.md` (Task 20 Search, Filter, And Sort Options)
- `docs/ROADMAP.md` (Phase 3)
- `docs/evidence/task-20-browse-scale-up-trigger/RESULT.md`
- `app/(tabs)/browse.tsx`
- `src/features/products/api.ts`
