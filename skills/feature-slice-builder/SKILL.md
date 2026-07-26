# feature-slice-builder

Goal: build one small vertical feature from `docs/TASKS.md` — data to UI — from task to validation.

## When to use

- A `docs/TASKS.md` task that spans data and UI, such as Task 6 (mock product data), Task 7 (Browse screen with mock product list), Task 8 (Product Detail screen), or Task 9 (Rating Form with fake local state).
- Connected catalog read tasks after mock UX is validated (Task 10), such as Task 14 (Browse/Detail Supabase reads) — still data + UI, but against an already-shipped schema.
- Authentication product work (Task 15) — sign-up / sign-in / sign-out, recovery, session lifecycle, and protected account-deletion **feature** integration.
- Connected rating persistence and Rated Products (Task 16) — authenticated rating reads/writes against an already-shipped (or just-shipped) schema.
- The task delivers something a user can see and touch, backed by types or data.

## When not to use

- The work is purely one screen's visuals or layout: use `skills/ui-screen-builder`.
- The work needs SQL, a migration, or RLS: use `skills/supabase-schema-change` first (then return here for the UI/integration packet).
- The work only reshapes frontend types or mock data with no screen work: use `skills/product-data-modeling`.
- Directly deleting accounts (or any other MCP **FORBIDDEN** action) on local, staging, or production: never — implementing the in-app delete-account flow is allowed; performing account deletion through MCP/tools is not (`docs/SECURITY.md`, `docs/MCP_WORKFLOW.md`).

## Inputs expected

- One named task from `docs/TASKS.md` (for example "Task 7: Build Browse Screen With Mock Product List", "Task 14: Real Browse And Product Detail Reads", "Task 15: Authentication", or "Task 16: My Rating Persistence And Rated Products").
- Nothing else; scope is the task as written.

## Read first

- The task's own section in `docs/TASKS.md`.
- The matching flow and route requirements in `docs/USER_FLOWS.md` (for example Browse is `app/(tabs)/browse.tsx`; Product Detail is `app/product/[id]/index.tsx`; Rating Form is `app/product/[id]/rate.tsx`; auth routes `sign-in` / `sign-up` / `forgot-password` / `reset-password`; Rated Products as documented).
- The matching types, API functions, and query keys in `docs/API_CONTRACTS.md` (`Product`, `ProductCardData`, `src/types/product.ts`, `src/features/products/mockProducts.ts`; auth and rating mutation contracts when the task owns them).
- The component rules for the task's screens in `docs/DESIGN.md`.
- For connected-read tasks (Task 14): Privileges / published-catalog rules in `docs/DATA_MODEL.md` and `docs/SECURITY.md` (reads only; no schema edits).
- For auth-connected (Task 15) and connected-write (Task 16): auth and rating contracts in `docs/API_CONTRACTS.md`, plus `docs/SECURITY.md` / `docs/MCP_WORKFLOW.md` (no service-role in the Expo bundle; account deletion via MCP is FORBIDDEN).

## Routine

1. Restate the task scope in one sentence; anything beyond it is out of scope.
2. Confirm every route the task touches exists in `docs/USER_FLOWS.md` under the same name. If a needed route is not documented, stop (see stop conditions).
3. Confirm the data shapes against `docs/API_CONTRACTS.md`. Use the documented names exactly (`Product`, `ProductCardData`, `RatingBreakdown`, and auth/rating APIs the task names).
4. Choose the data mode from the task packet:
   - **Mock-first (Tasks 6–9 / pre–Task 10):** use `src/features/products/mockProducts.ts`; do not connect Supabase.
   - **Connected-read (Task 14 catalog-read slices):** replace validated mock repositories with Supabase reads for the screens the task names. Do **not** add migrations, RLS, grants, or schema edits in this skill — stop and transfer to `skills/supabase-schema-change` if those are required. Rating writes stay mock/session until the task that owns persistence (Task 16) says otherwise.
   - **Auth-connected (Task 15):** wire email (or approved) auth provider operations — sign-up, sign-in, sign-out, session persistence, password recovery (`app/auth/forgot-password.tsx` request + `app/auth/reset-password.tsx` completion / deep-link target), auth-state UI on Account / Rate gate, and local session/cache cleanup on auth change. Implement the **Delete Account product flow** (confirmation UI + call to a protected server-side deletion path that never embeds a service-role key in the Expo bundle) and provide a human-run destructive verification checklist. Do **not** delete accounts yourself through the app, MCP, SQL consoles, or admin APIs while building or validating the feature — those actions are FORBIDDEN on every environment. If the Task 14 transitional session rating map still exists, namespace it by signed-in user and clear or re-key on auth change.
   - **Connected-write (Task 16):** replace session My Rating with authenticated rating create/update/delete against Supabase using the documented save path (security-definer helper **or** insert vs score-only update with `23505` retry — never PostgREST upsert of identity columns). Enforce the 500-character `private_note` limit in-form; ship Rated Products (`getUserRatedProducts` + `app/account/rated-products.tsx`); handle mutation loading/error/empty states and query-cache invalidation. If the preferred helper or any SQL/RLS/grant work is missing, stop and run a clearly scoped `skills/supabase-schema-change` sub-packet first, then return to this mode for frontend integration — do not invent schema inside this skill.
5. Build the smallest vertical slice: types -> data -> screen wiring, reusing `src/components/ui/*` primitives (`Screen`, `Card`, `AppText`, `ScoreBadge`, `LoadingState`, `EmptyState`, `ErrorState`).
6. Add loading, empty, and error states for every data surface the slice introduces (and honest success/error for auth/recovery/delete and rating mutations).
7. Wire navigation per `docs/USER_FLOWS.md` (product card tap navigates to `/product/[id]`; auth and Rated Products routes as the task names).
8. Run verification, then the memory step.

## Verification

- `npm run typecheck`, plus `npm run lint` if files were added or imports changed.
- `npm run check` if routes or dependencies changed.
- Manually walk the affected flow (for example Browse -> tap card -> Product Detail) in the simulator or web preview if the app is running.
- For connected-read mode: confirm anonymous Browse/Detail hit published Supabase rows and that no migration or RLS file changed in the slice.
- For auth-connected mode: confirm sign-up creates the profile row via the existing trigger; Rate CTA gates logged-out users; recovery and the non-destructive delete-account checks match the task acceptance without embedding service-role credentials. Actual account deletion requires a recorded human-run check; the coding agent must not perform it through the app, MCP, SQL, or an admin API.
- For connected-write mode: confirm signed-in save/load/delete of My Rating, private-note limit fails in-form, Rated Products lists only the viewer’s ratings, and no identity-column PostgREST upsert was introduced.

## Stop conditions

- The task turns out to need a schema change: stop and switch to `skills/supabase-schema-change` (then return for auth-connected / connected-write UI integration).
- The task needs a route that does not exist in `docs/USER_FLOWS.md`: stop and report; route additions are a flow decision, not a side effect.
- Connected-read mode discovers missing policies, grants, or columns: stop; do not invent schema — hand off to `skills/supabase-schema-change`.
- Auth-connected or connected-write mode would require performing a FORBIDDEN MCP/security action (account deletion via tools, production DB access, service-role in the client): stop and refuse; implement only the approved in-app / protected-server path.
- Connected-write mode discovers a missing security-definer helper, grant, or policy required by the chosen save path: stop and hand off a scoped `supabase-schema-change` packet first.

## Memory step

- Update the task's status in `docs/TASKS.md` (Done / Partial, plus newly discovered follow-ups).
- Add a `docs/DECISIONS.md` entry only if work beyond the written task
  introduced a durable high-impact contract, route, or component decision.

## Common mistakes

- Building Feed polish while the task is Browse or Product Detail.
- Inventing a new product shape instead of using `ProductCardData`.
- Skipping empty/error states because mock data never fails.
- Connecting Supabase before the mock UX flow is validated (Task 10).
- Using mock-first rules on Task 14+ (blocking required published-catalog reads) or smuggling migrations into a connected-read slice.
- Treating Task 15/16 as connected-read (catalog-only) and inventing an ad-hoc auth/write workflow.
- Deleting accounts through MCP or admin tooling while implementing Task 15’s Delete Account feature.
- Using PostgREST `.upsert()` on `user_ratings` identity columns in connected-write mode.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
