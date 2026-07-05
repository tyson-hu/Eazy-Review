# product-data-modeling

Goal: change frontend product/rating data shapes, types, or mock data — keeping types, mocks, and contracts in sync with no SQL involved.

## When to use

- Changes to `Product`, `ProductCardData`, `RatingBreakdown`, `ProductRatingSummary`, or `ProductOffer` in `src/types/product.ts`.
- Changes to mock data in `src/features/products/mockProducts.ts`.
- How product or rating data is shaped, derived, or displayed on the frontend (for example price formatting, score display fields).

## When not to use

- Anything needing SQL, a migration, or RLS: use `skills/supabase-schema-change` (it includes syncing frontend types).
- Screen layout or visual work: use `skills/ui-screen-builder`.

## Inputs expected

- The shape change needed and which screens or functions consume it.

## Read first

- `docs/API_CONTRACTS.md`: Frontend Product Types, Product Card Shape, Mock Data Contract.
- `docs/DATA_MODEL.md` only if the change mirrors a database contract (column names map to camelCase fields).

## Routine

1. Confirm the change is frontend-only. If it implies a database column, stop and switch skills.
2. Keep `ProductCardData` flat: `id`, `brand`, `name`, `sku`, `imageUrl`, `eazyScore`, `communityScore`, `ratingCount`, `lowestPrice`. Do not nest sub-objects into the card shape.
3. Apply UI naming rules: fields are camelCase mirrors of the documented schema (`eazyScore`, not `officialScore`); user-facing labels stay `Eazy Score`, `Community Score`, `My Rating`.
4. Update `src/types/product.ts`, `src/features/products/mockProducts.ts`, and the type blocks in `docs/API_CONTRACTS.md` together in the same change.
5. Update every consumer the typecheck flags (screens, `src/features/products/*`); do not leave `any` casts to silence errors.
6. Run verification, then the memory step.

## Verification

- `npm run typecheck` — must pass with no new suppressions.
- `npm run lint` if imports or files changed.
- Spot-check one consuming screen (Browse or Product Detail) still renders the shape correctly.

## Stop conditions

- The change implies a new rating category beyond `look`, `comfort`, `quality`, `outfit`, `value`, `overall`: stop; that is a product decision.
- The change turns out to need SQL or a view (for example `product_card_view` materialization): stop and switch to `skills/supabase-schema-change`.

## Memory step

- Update `docs/TASKS.md` if the shape change completes or unblocks a listed task.
- Add a `docs/DECISIONS.md` entry for contract-shape decisions (new fields, renames, nullability changes).

## Common mistakes

- Editing `src/types/product.ts` without updating `docs/API_CONTRACTS.md`, so docs and code drift.
- Making mock data richer than the contract (fields the real API will never return).
- Nesting summary or offer objects into `ProductCardData` because one screen wanted it.
- Renaming fields away from the schema mirror (database `size_type` -> frontend `sizeType`, nothing else).

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
