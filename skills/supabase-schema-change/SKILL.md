# supabase-schema-change

Goal: safely change database schema, RLS, migrations, or data contracts, keeping docs and frontend types in sync in the same change.

## When to use

- Any change requiring SQL, a migration, or an RLS policy: the tables `profiles`, `products`, `product_images`, `eazy_assessments`, `user_ratings`, `rating_aggregates`, `product_offers`, the `refresh_rating_aggregates` function, or the `user_ratings_refresh_aggregates_trigger` / `user_ratings_product_id_immutable` triggers.
- Changes to database-backed contracts (a new column that frontend types must expose, the future `product_card_view`).

## When not to use

- Frontend-only shape, type, mock, or display changes with no SQL: use `skills/product-data-modeling`.
- Screen work that merely consumes existing data: use `skills/ui-screen-builder` or `skills/feature-slice-builder`.

## Inputs expected

- The schema or policy change needed and why (which task or bug requires it).
- Whether it affects existing data.
- Which task packet owns the change (`docs/TASKS.md` Tasks 11–18). Do not put Task 12 policies or client `GRANT`s into a Task 11 migration.

## Read first

- `docs/DATA_MODEL.md` in full for the affected tables (schema, Privileges And Data API Exposure, RLS, Rating Summary Logic).
- The affected contracts in `docs/API_CONTRACTS.md` (`Product`, `ProductRatingSummary`, `ProductOffer`, `ProductCardData`).
- `docs/SECURITY.md` Supabase Environments And Agent Boundaries.
- The matching task in `docs/TASKS.md` (Task 11 deny-by-default vs Task 12 policies + grants).

## Routine

1. Write the change as SQL against the documented schema first; confirm it does not conflict with `docs/DATA_MODEL.md` naming rules (`comfort` not `comforts`, `value` or `resale_markup` not `markups`, `private_note` not `comment`, `eazy_assessments` / `rating_aggregates` not the obsolete names).
2. Create a migration file in `supabase/migrations/` — never edit applied migrations.
3. Apply the correct packet defaults:
   - **Task 11 (schema create):** enable RLS on every new exposed table in the same migration (deny-by-default). Do **not** add public/catalog policies and do **not** `GRANT` to `anon` or `authenticated`. Optional `service_role` tooling grants only. Include `product_offers` in the first schema slice. Revoke `EXECUTE` on aggregate helpers from `PUBLIC` / `anon` / `authenticated`. Serialize per-product aggregate refresh (advisory/xact lock before reading `user_ratings`). Ensure a zero-count `rating_aggregates` row on `products` INSERT. Add `handle_new_user` on `auth.users` AFTER INSERT to create `public.profiles (id)` only (revoke client EXECUTE). Environment setup files (`supabase/config.toml`, env example/validation, package scripts/lockfile for CLI/secret-scan) are in scope when required by the Task 11 checklist — not UI screens.
   - **Task 12 (policies + grants):** add published-product catalog policies and owner-only `user_ratings` policies from `docs/DATA_MODEL.md` (INSERT/UPDATE also require `is_published`), **then** least-privilege `GRANT`s for `anon` / `authenticated` — including **column-level** `UPDATE` on `profiles` (`display_name`, `username`, `avatar_url`) and column-level `INSERT`/`UPDATE` on `user_ratings` (scores + `private_note` only). Never grant client roles before the authorizing policies exist. Keep `updated_at` trigger-maintained (no client UPDATE grant on timestamps / `id`). Task 16 rating writes must not use PostgREST upsert of identity columns.
4. Keep Community Score recalculation server-side: any change touching `user_ratings` aggregates goes through `refresh_rating_aggregates` and its trigger, never client code. Keep `user_ratings.product_id` immutable.
5. Update `docs/DATA_MODEL.md` to match the new schema exactly, in the same change.
6. Sync frontend types in `src/types/product.ts` and the contracts in `docs/API_CONTRACTS.md`, plus mock data in `src/features/products/mockProducts.ts` if the shape changed.
7. Run verification, then the memory step.

## Verification

- Review the migration SQL against `docs/DATA_MODEL.md` line by line.
- Confirm RLS is enabled on every new table. For Task 11, confirm there are no client policies or `anon`/`authenticated` grants yet. For Task 12, confirm each policy and grant is listed in the doc and authorization scenarios are covered.
- Confirm aggregate helpers cannot be executed by `anon` / `authenticated` via RPC.
- `npm run typecheck` for the synced frontend types.
- If a local Supabase instance exists, apply the migration there before calling the change done; if not, state that it has not been applied anywhere. Staging only with explicit approval; never production.

## Stop conditions

- The migration would drop or rewrite existing data (`drop table`, `drop column`, destructive `update`): stop and get explicit human approval first.
- The change touches service-role keys, or any path that would put one in client code: stop immediately.
- A new rating category is being added to `user_ratings`: stop; rating categories are a product decision (`look`, `comfort`, `quality`, `outfit`, `value`, `overall` are fixed for MVP).
- A migration would be applied to a remote/hosted Supabase project: stop and get explicit approval; this skill assumes local migrations by default, staging only when approved.
- Any production database access, migration, or write: stop and refuse — production is unavailable to agents (`docs/SECURITY.md`, `docs/MCP_WORKFLOW.md`).

## Memory step

- Update `docs/TASKS.md` (Supabase Tasks section) with what is done or newly discovered.
- Add a `docs/DECISIONS.md` entry — schema changes are always meaningful.

## Common mistakes

- Changing `docs/DATA_MODEL.md` and the SQL in different changes, leaving them out of sync.
- Adding public-read policies or `anon`/`authenticated` grants during Task 11 (locks must stay deny-by-default until Task 12).
- Forgetting RLS on a new table at create time.
- Recalculating `rating_aggregates` in the app because it seemed simpler.
- Refreshing aggregates without per-product serialization (concurrent ratings can leave a stale `rating_count` / averages after `ON CONFLICT`).
- Shipping a product without a zero-count `rating_aggregates` row (Detail expects a joinable summary; Task 14 normalization is a safety net, not a substitute for the ensure trigger/seed).
- Using PostgREST `.upsert()` on `user_ratings` with identity columns under column-level UPDATE grants.
- Creating auth users without a `public.profiles` row (missing `handle_new_user`), or granting clients `INSERT` on `profiles` instead of the trigger.
- Leaving `SECURITY DEFINER` aggregate functions executable by `anon` / `authenticated`.
- Using obsolete names `official_ratings` or `product_rating_summary`.
- Widening a migration into a refactor of adjacent tables.
- Leaving table-wide `UPDATE`/`INSERT` grants on `profiles` / `user_ratings` (clients could rewrite `id` / timestamps); use the column-level grants in `docs/DATA_MODEL.md`.
- Allowing rating INSERT/UPDATE against unpublished products (ownership-only `WITH CHECK` is not enough).
- Treating production database writes as approvable HIGH IMPACT MCP actions — they are forbidden.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
