# feature-slice-builder

Goal: build one small vertical feature from `docs/TASKS.md` — data to UI — from task to validation.

## When to use

- A `docs/TASKS.md` task that spans data and UI, such as Task 6 (mock product data), Task 7 (Browse screen with mock product list), Task 8 (Product Detail screen), or Task 9 (Rating Form with fake local state).
- The task delivers something a user can see and touch, backed by types or data.

## When not to use

- The work is purely one screen's visuals or layout: use `skills/ui-screen-builder`.
- The work needs SQL, a migration, or RLS: use `skills/supabase-schema-change`.
- The work only reshapes frontend types or mock data with no screen work: use `skills/product-data-modeling`.

## Inputs expected

- One named task from `docs/TASKS.md` (for example "Task 7: Build Browse Screen With Mock Product List").
- Nothing else; scope is the task as written.

## Read first

- The task's own section in `docs/TASKS.md`.
- The matching flow and route requirements in `docs/USER_FLOWS.md` (for example Browse is `app/(tabs)/browse.tsx`; Product Detail is `app/product/[id].tsx`; Rating Form is `app/product/[id]/rate.tsx`).
- The matching types, API functions, and query keys in `docs/API_CONTRACTS.md` (`Product`, `ProductCardData`, `src/types/product.ts`, `src/features/products/mockProducts.ts`).
- The component rules for the task's screens in `docs/DESIGN.md`.

## Routine

1. Restate the task scope in one sentence; anything beyond it is out of scope.
2. Confirm every route the task touches exists in `docs/USER_FLOWS.md` under the same name. If a needed route is not documented, stop (see stop conditions).
3. Confirm the data shapes against `docs/API_CONTRACTS.md`. Use the documented names exactly (`Product`, `ProductCardData`, `RatingBreakdown`).
4. Build mock-first: use `src/features/products/mockProducts.ts` data; do not connect Supabase.
5. Build the smallest vertical slice: types -> data -> screen wiring, reusing `src/components/ui/*` primitives (`Screen`, `Card`, `AppText`, `ScoreBadge`, `LoadingState`, `EmptyState`, `ErrorState`).
6. Add loading, empty, and error states for every data surface the slice introduces.
7. Wire navigation per `docs/USER_FLOWS.md` (product card tap navigates to `/product/[id]`).
8. Run verification, then the memory step.

## Verification

- `npm run typecheck`, plus `npm run lint` if files were added or imports changed.
- `npm run check` if routes or dependencies changed.
- Manually walk the affected flow (for example Browse -> tap card -> Product Detail) in the simulator or web preview if the app is running.

## Stop conditions

- The task turns out to need a schema change: stop and switch to `skills/supabase-schema-change`.
- The task needs a route that does not exist in `docs/USER_FLOWS.md`: stop and report; route additions are a flow decision, not a side effect.

## Memory step

- Update the task's status in `docs/TASKS.md` (Done / Partial, plus newly discovered follow-ups).
- Add a `docs/DECISIONS.md` entry only if a contract, route, or component decision was made beyond the task as written.

## Common mistakes

- Building Feed polish while the task is Browse or Product Detail.
- Inventing a new product shape instead of using `ProductCardData`.
- Skipping empty/error states because mock data never fails.
- Connecting Supabase before the mock UX flow is validated (Task 10).

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
