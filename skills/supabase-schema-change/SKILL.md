# supabase-schema-change

Goal: safely change database schema, RLS, migrations, or data contracts, keeping docs and frontend types in sync in the same change.

## When to use

- Any change requiring SQL, a migration, or an RLS policy: the tables `profiles`, `products`, `product_images`, `official_ratings`, `user_ratings`, `product_rating_summary`, `product_offers`, the `refresh_product_rating_summary` function, or the `user_ratings_refresh_summary_trigger` trigger.
- Changes to database-backed contracts (a new column that frontend types must expose, the future `product_card_view`).

## When not to use

- Frontend-only shape, type, mock, or display changes with no SQL: use `skills/product-data-modeling`.
- Screen work that merely consumes existing data: use `skills/ui-screen-builder` or `skills/feature-slice-builder`.

## Inputs expected

- The schema or policy change needed and why (which task or bug requires it).
- Whether it affects existing data.

## Read first

- `docs/DATA_MODEL.md` in full for the affected tables (schema, RLS, Rating Summary Logic).
- The affected contracts in `docs/API_CONTRACTS.md` (`Product`, `ProductRatingSummary`, `ProductOffer`, `ProductCardData`).

## Routine

1. Write the change as SQL against the documented schema first; confirm it does not conflict with `docs/DATA_MODEL.md` naming rules (`comfort` not `comforts`, `value` or `resale_markup` not `markups`).
2. Create a migration file in `supabase/migrations/` — never edit applied migrations.
3. Apply the RLS defaults to any new table: public `select` for product-related data; `user_ratings` writes restricted to `auth.uid() = user_id` for insert/update/delete.
4. Keep Community Score recalculation server-side: any change touching `user_ratings` aggregates goes through `refresh_product_rating_summary` and its trigger, never client code.
5. Update `docs/DATA_MODEL.md` to match the new schema exactly, in the same change.
6. Sync frontend types in `src/types/product.ts` and the contracts in `docs/API_CONTRACTS.md`, plus mock data in `src/features/products/mockProducts.ts` if the shape changed.
7. Run verification, then the memory step.

## Verification

- Review the migration SQL against `docs/DATA_MODEL.md` line by line.
- Confirm RLS is enabled on every new table and each policy is listed in the doc.
- `npm run typecheck` for the synced frontend types.
- If a local Supabase instance exists, apply the migration there before calling the change done; if not, state that it has not been applied anywhere.

## Stop conditions

- The migration would drop or rewrite existing data (`drop table`, `drop column`, destructive `update`): stop and get explicit human approval first.
- The change touches service-role keys, or any path that would put one in client code: stop immediately.
- A new rating category is being added to `user_ratings`: stop; rating categories are a product decision (`look`, `comfort`, `quality`, `outfit`, `value`, `overall` are fixed for MVP).
- A migration would be applied to a remote/hosted Supabase project: stop and get explicit approval; this skill assumes local migrations only.

## Memory step

- Update `docs/TASKS.md` (Supabase Tasks section) with what is done or newly discovered.
- Add a `docs/DECISIONS.md` entry — schema changes are always meaningful.

## Common mistakes

- Changing `docs/DATA_MODEL.md` and the SQL in different changes, leaving them out of sync.
- Forgetting RLS on a new table (default deny is not enough; the public-read policies are deliberate).
- Recalculating `product_rating_summary` in the app because it seemed simpler.
- Widening a migration into a refactor of adjacent tables.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
