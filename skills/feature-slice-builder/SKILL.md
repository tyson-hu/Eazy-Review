# feature-slice-builder

Goal: build one small vertical feature from `docs/TASKS.md` — data to UI — from task to validation.

## When to use

- A `docs/TASKS.md` task that spans data and UI.
- Connected catalog reads (Task 15) against the already-shipped schema.
- Core authentication and Account state (Task 16), connected rating
  persistence and Rated Products (Task 17), password recovery (Task 18), or
  protected account-deletion feature integration (Task 19).
- The task delivers something a user can see and touch, backed by types or data.

## When not to use

- Do not use this skill as the PR-wide outer orchestration loop when an
  implementation PR has existing findings requiring current-head triage.
- The work is purely one screen's visuals or layout: use `skills/ui-screen-builder`.
- Task 14 client/query/test infrastructure with no connected screen: follow
  the task contract and canonical workflow directly.
- The work needs SQL, a migration, or RLS: use `skills/supabase-schema-change` first (then return here for the UI/integration packet).
- The work only reshapes frontend types or scoped fixtures with no screen work: use `skills/product-data-modeling`.
- Directly deleting accounts (or any other MCP **FORBIDDEN** action) on local, staging, or production: never — implementing the in-app delete-account flow is allowed; performing account deletion through MCP/tools is not (`docs/SECURITY.md`, `docs/MCP_WORKFLOW.md`).

### When used inside PR remediation

For an assigned correction, apply this skill's matching task-mode contracts and
routine normally. `skills/pr-review-remediation` retains the epoch, finding
disposition, remediation scope, review budget, and terminal verdict. The
memory step is report-only: report task-status, ADR, follow-up, handoff, or
blocker needs to the outer owner, and do not edit those files unless the outer
accepted scope explicitly includes them.

## Inputs expected

- One named task or explicitly bounded packet from `docs/TASKS.md`.
- The accepted packet defines edit scope; task sections supply contracts and
  prerequisites, not additional authority.

## Read first

- The task's own section in `docs/TASKS.md`.
- The matching flow and route requirements in `docs/USER_FLOWS.md` (for example Browse is `app/(tabs)/browse.tsx`; Product Detail is `app/product/[id]/index.tsx`; Rating Form is `app/product/[id]/rate.tsx`; auth routes `sign-in` / `sign-up` / `forgot-password` / `reset-password`; Rated Products as documented).
- The matching types, API functions, and query keys in `docs/API_CONTRACTS.md`
  (`Product`, `ProductCardData`, `ProductDetailPublicData`, and
  `src/types/product.ts`; auth and rating mutation contracts when the task owns
  them).
- The component rules for the task's screens in `docs/DESIGN.md`.
- For connected reads: privileges / published-catalog rules in
  `docs/DATA_MODEL.md` and `docs/SECURITY.md` (reads only; no schema edits).
- For Tasks 16–19: the task-owned auth/rating contracts in
  `docs/API_CONTRACTS.md`, plus `docs/SECURITY.md` /
  `docs/MCP_WORKFLOW.md` (no service-role in the Expo bundle; account deletion
  via MCP/tools is FORBIDDEN).

## Routine

### Ownership for Tasks 16–19

Tasks 16–19 are parent-owned, verified-strong implementations. The parent
follows this skill for the integrated slice and keeps reviewer and verifier
independent. The generic implementer may receive only explicitly bounded,
non-sensitive leaf packets; it never owns auth/session state, rating
authorization, recovery verification, account-deletion authority, secrets, or
the protected server boundary. No security-specific implementer role is
introduced.

1. Restate the task scope in one sentence; anything beyond it is out of scope.
2. Confirm every route the task touches exists in `docs/USER_FLOWS.md` under the same name. If a needed route is not documented, stop (see stop conditions).
3. Confirm the data shapes against `docs/API_CONTRACTS.md`. Use the documented names exactly (`Product`, `ProductCardData`, `ProductDetailPublicData`, `RatingBreakdown`, and auth/rating APIs the task names).
4. Select feature mode from the approved behavior and data boundary.
   Existing-schema public reads use connected-read guidance; authenticated
   sessions, private writes, recovery, and protected deletion use their
   matching sensitive workflow. Apply Task 15–19 details only when the
   requested change affects those task contracts. A later existing-schema
   catalog feature does not inherit Task 15's historical rating-unavailable
   requirement, require a schema migration, or reopen completed acceptance.
   Use the approved current task contract and specified files; a needed scope
   expansion still requires the parent/user decision.

   Historical task-contract cases: consult only the case affected by this packet.

   - **Connected-read (Task 15):** use published Supabase reads for Browse and
     Product Detail. Keep anonymous
     browsing and map sparse data honestly. Only for the original Task 15
     transition before authentication exists, make rating unavailable until
     authentication is connected. Do **not** add migrations, RLS, grants, or
     schema edits in this skill.
   - **Core-auth (Task 16):** wire email/password sign-up, sign-in, sign-out,
     session restoration, owner-profile Account state, the logged-out Rate
     gate with return-to-product behavior, and user-scoped cache cleanup on
     sign-out/account switch. Do not add recovery, deletion, or rating
     persistence.
   - **Connected-write (Task 17):** replace the unavailable rating state with
     authenticated rating read/create/update using the documented insert then
     score/private-note-only update path with `23505` retry; never PostgREST
     upsert identity columns. Enforce the 500-character `private_note` limit,
     ship Rated Products (`getUserRatedProducts` +
     `app/account/rated-products.tsx`), and handle mutation states plus complete
     query invalidation.
   - **Recovery (Task 18):** add the request and completion routes, verified
     recovery-only session state, redirect/deep-link handling, and honest
     expired/replayed/malformed/direct-navigation behavior. Do not fold this
     work back into core auth.
   - **Protected deletion (Task 19):** build the in-app confirmation and
     reauthentication flow plus the caller-derived protected server boundary;
     keep server-only secrets out of Expo and provide the required human-run
     destructive verification checklist. Do **not** perform account deletion
     yourself through the app, MCP, SQL, consoles, or admin APIs.
   If any mode needs SQL/RLS/grant work not owned by its task, stop and run a
   separately scoped `skills/supabase-schema-change` packet before returning;
   do not invent schema inside this skill.
5. Build the smallest vertical slice: types -> data -> screen wiring, reusing `src/components/ui/*` primitives (`Screen`, `Card`, `AppText`, `ScoreBadge`, `LoadingState`, `EmptyState`, `ErrorState`).
6. Add loading, empty, and error states for every data surface the slice introduces, plus honest success/error states for task-owned auth, recovery, deletion, or rating operations.
7. Wire navigation per `docs/USER_FLOWS.md` (product card tap navigates to `/product/[id]`; auth and Rated Products routes as the task names).
8. Run verification, then the memory step.

## Verification

- `npm run typecheck`, plus `npm run lint` if files were added or imports changed.
- After the implementation packet returns, the parent runs
  `npm run prepare:routes` when routes/configuration require it, inspects
  tracked drift, delegates the read-only `npm run check:readonly` gate, and
  runs `npm run check:expo` outside the sandbox when routes or dependencies
  changed. The generic implementer never owns route preparation or the full
  Expo gate.
- Manually walk the affected flow (for example Browse -> tap card -> Product Detail) in the simulator or web preview if the app is running.
- For connected-read mode: confirm anonymous Browse/Detail hit published Supabase rows and that no migration or RLS file changed in the slice.
- For core-auth mode: confirm sign-up creates one profile via the existing
  trigger, session restoration works, the Rate CTA gates logged-out users, and
  sign-out/account switching clears prior user-scoped data.
- For connected-write mode: confirm signed-in save/load/edit of My Rating, the
  private-note limit fails in-form, Rated Products lists only the viewer’s
  ratings, required caches invalidate, and no identity-column PostgREST upsert
  was introduced.
- For recovery mode: confirm only verified recovery state enables password
  update and complete the physical-device deep-link check required by Task 18.
- For protected-deletion mode: confirm the non-destructive client/server
  boundary checks and hand a human the destructive checklist. The coding agent
  must not perform the deletion.

## Stop conditions

- The task turns out to need a schema change: stop and switch to
  `skills/supabase-schema-change`, then return only for the task’s matching
  feature mode.
- The task needs a route that does not exist in `docs/USER_FLOWS.md`: stop and report; route additions are a flow decision, not a side effect.
- Connected-read mode discovers missing policies, grants, or columns: stop; do not invent schema — hand off to `skills/supabase-schema-change`.
- Any mode would require performing a FORBIDDEN MCP/security action (account
  deletion via tools, production DB access, service-role in the client): stop
  and refuse; implement only the approved in-app/protected-server path.
- Connected-write mode discovers a missing security-definer helper, grant, or policy required by the chosen save path: stop and hand off a scoped `supabase-schema-change` packet first.

## Memory step

- Inside PR remediation, report all memory needs to the outer owner without
  editing; only an explicit outer accepted scope for the target files permits
  those writes.
- Update the task's status in `docs/TASKS.md` (Done / Partial, plus newly discovered follow-ups).
- Add or update a `docs/decisions/*.md` record only if work beyond the written task introduced a durable high-impact contract, route, or component decision under `docs/decisions/README.md`.

## Common mistakes

- Building Feed polish while the task is Browse or Product Detail.
- Inventing a new product shape instead of using `ProductCardData`.
- Skipping empty/error states because a happy-path fixture never fails.
- Routing Task 14 infrastructure through this user-visible feature skill.
- Treating Tasks 16–19 as one auth packet instead of preserving their separate
  core-auth, write, recovery, and deletion boundaries.
- Deleting accounts through MCP or admin tooling while implementing Task 19.
- Using PostgREST `.upsert()` on `user_ratings` identity columns in connected-write mode.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
