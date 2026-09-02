---
id: decision-browse-scale-up-trigger
date: 2026-09-02
status: proposed
area: architecture
tasks: [20]
pr: null
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
client-side (`app/(tabs)/browse.tsx` `matchesQuery`). The local seed and the
last observed staging catalog each expose two published products. Existing
indexes (`products_brand_idx`, GIN `products_name_idx`) are unused by the
client.

## Decision

Task 20 implementation starts only when a human/parent records in
`docs/TASKS.md` that **any one** of these criteria is met:

1. **Catalog size.** Published catalog ≥ 300 products, or a scheduled catalog
   load (Task 28 import or a seed change) is planned to exceed 300 published
   products before the next beta milestone.
2. **Browse payload.** Measured or projected Browse single-request payload ≥
   1 MB, where projection = measured bytes per published product × published
   count for the same `BROWSE_SELECT` shape.
3. **Latency / UI.** Browse full-catalog request median ≥ 2 s on a physical
   device over Wi‑Fi against staging, **or** one search keystroke's
   filter+render exceeds ~50 ms on device (filter alone is not enough —
   eager `.map` rendering in a ScrollView is the practical UI bound).

Until one criterion is recorded as met, keep client-side search over the
small catalog. Do not ship Filter/Sort/pagination placeholders.

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
- At the 2026-09-02 evaluation (2 published products, ~699 B/product, local
  Browse median ~6 ms), none of the criteria are met; Task 20 stays
  Conditional and Task 21 is the next Revised Sequence item to select.
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
