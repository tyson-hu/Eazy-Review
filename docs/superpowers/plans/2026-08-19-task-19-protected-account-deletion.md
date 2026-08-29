# Task 19 Protected Account Deletion Implementation Plan

Status: Diagnostic head `b843dc8` proved the injected-client storage-key
mismatch; Database CI passed and Expo CI remained red. Its integrated review
also accepted guard-arm ordering and settled same-principal recovery defects.
The revised design contract covering injection-first storage identity,
Auth-lock-before-arm sequencing, exact settled/expired-pending recovery
predecessors, same-session-ID S2, and unknown-snapshot no-cleanup was approved
in chat on 2026-08-22. This implementation-plan revision was approved in chat
on 2026-08-22. The bounded local remediation is implemented, the temporary
diagnostics are removed, and the product/test candidate is frozen as Git tree
`3d8bf2be5cfadab6197c95b4f4036006df4caab4`. Affected 6-suite / 205-test and
full 41-suite / 495-test frontend runs, `check:readonly`, `check:expo`, and
25/25 Deno Function tests passed in disposable credential-free validation.
The remediation and initial documentation sync are committed/pushed at
`28ac20204ef4c2386b0aa041f805ee2aea520780`; exact-head Expo CI run
`32615690386` and Database CI run `32615690393` passed. Prior PR head
`f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e` also passed exact-head Expo CI
run `32615974049` and Database CI run `32615974012`. The 2026-08-29 safe
Function, frontend, local database/gateway, mobile-web, and iOS Simulator lanes
passed with documented limits against that head. A5 maintenance PR #44
validated and merged the ten expected SDK 57 patches (`f3886a5` / `33c66ee`);
Task 19 is rebased locally onto that `master` at `1647f58`, with publish and
fresh exact-head CI still pending. Physical-device review, hosted
configuration/deployment, destructive acceptance, readiness, merge, and
production remain separate gates. Current progress and detailed evidence live
in `RESULT.md` and `VERIFICATION.md` under the Task 19 evidence folder.

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` only for explicitly bounded,
> non-sensitive leaf packets, or `superpowers:executing-plans` for parent-led
> execution. Steps use checkbox (`- [ ]`) syntax for tracking. The primary
> agent owns Auth/session state, the deletion operation, and the protected
> server boundary.

**Goal:** Add a discoverable, reauthenticated in-app Delete Account flow whose
Edge Function derives the caller, revokes all refresh sessions, hard-deletes
that caller, and settles local auth/cache without exposing secrets or
misstating partial outcomes.

**Architecture:** Account calls one provider-owned `deleteAccount(password)`
operation. The provider reauthenticates principal A, pins the returned bearer
to a zero-body Edge Function invocation, and combines a provider-local Auth
writer fence, a cross-context principal-bound Auth-storage guard/transaction, a
versioned latest-winner state, and principal-specific cache cleanup so A's late
work cannot revoke or remove a newer session or signed-out winner.
Deletion arms under a short `Auth operation -> storage` section before isolated
reauthentication, while recovery adopts S2 only from an exact operation-local
settled or lease-expired-pending predecessor. Unknown displacement never grants
session, companion, or same-principal cache cleanup authority.
The Deno function separates a pure request orchestrator from the only Supabase
Auth Admin adapter; automated server tests use injected mocks and no
permissions.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6,
NativeWind, Supabase JS/Auth/Functions 2.112.0, Supabase Edge Functions on Deno
2.1, TanStack Query 5, Jest/RNTL, Deno test, pgTAP, GitHub Actions.

**Spec:**
`docs/superpowers/specs/2026-08-19-task-19-protected-account-deletion-design.md`

## Global Constraints

- Task 19 only. No route, Settings screen, schema migration, RLS/grant change,
  soft deletion, retention store, upload cleanup, social auth, MFA, passkeys,
  or standalone global-sign-out feature.
- Email/password only. Use A's fixed email and pass password bytes unchanged.
- The server accepts no target ID. It derives one ID from server-backed
  `auth.getUser(jwt)` and matching verified claims from the same bearer.
- Require a detailed password AMR timestamp no older than 300 seconds; reject
  missing, string-only, malformed, non-finite, or over-60-seconds-future
  entries. JWT `iat` is not reauthentication evidence.
- Call `auth.admin.signOut(jwt, 'global')` before
  `auth.admin.deleteUser(derivedId, false)`. Never write to `auth.sessions`.
- Never automatically retry revocation or deletion. An uncertain delete allows
  one non-destructive `getUserById(derivedId)` lookup only.
- Lost/unprovable results stay ambiguous. Local cleanup after deletion,
  confirmed revocation, or ambiguity must not claim deletion.
- Preserve the latest newer session or signed-out winner. Remove only A's
  `account` and `rating` entries during superseded deletion settlement; retain
  newer-principal entries and all `catalog` entries.
- Deletion, ordinary local sign-out, recovery cleanup, and invalid bootstrap
  cleanup never call shared-client `auth.signOut`; they use isolated exact-
  bearer calls plus exact shared-storage transactions. All
  participating app Auth-storage writes use one platform-appropriate lock. A
  pending A guard must be persisted/read back before server dispatch; it hides
  A reads, blocks stale A writes/events, and lets B pass. The settlement
  transaction for destructive deletion removes a stored session only when its
  validated principal is A and the attempt revision still matches.
- Auth storage identity resolves in fixed order: explicit `storageKey`,
  explicitly injected client, then public-URL-derived singleton key. Ambient
  public configuration never overrides an injected provider/API namespace.
- After storage capability preflight releases, deletion acquires
  `Auth operation -> storage` to arm/read back `preparing`; it releases both
  locks before isolated reauthentication and later reacquires the same order for
  dispatch and settlement. No path waits for Auth operation while holding
  storage.
- Recovery predecessor snapshots remain operation-local and are never persisted
  or exposed. Settled recovery accepts only exact captured S1 or already-exact
  returned S2; lease-expired pending accepts only its exact captured session/
  empty predecessor or already-exact S2. Same-session-ID S2 is valid.
- Forced recovery reconciliation may remove session, companion, or same-
  principal cache state only from a non-null exact displaced snapshot; principal
  equality alone is never cleanup authority. Recovery-owned S2 remains
  maintenance-only until exact adoption succeeds.
- The local guard contains only store version, principal-keyed monotonic
  revision/state, Auth subject ID, optional explicitly adopted Auth session ID,
  and pending predecessor state/session ID. Never store or expose a token,
  email, password, profile/rating field, note, or provider response in it.
- Guard storage is principal-keyed: a later B record never replaces an older A
  record, and repeated updates deduplicate the same principal.
- Native uses process-wide storage serialization. Web requires the Web Locks
  and BroadcastChannel APIs before reauthentication or destructive dispatch;
  unsupported web runtimes fail safely without invoking the Edge Function.
- Guard-change notifications carry only a fixed version/change label. Providers
  reconcile guarded authority on mount, notification, and foreground; never put
  a principal, session, token, or outcome in the channel payload.
- Serialize provider-owned Auth session writers. Expected A reauthentication
  and exactly marked restoration events are maintenance; every other observed
  session or signed-out event replaces the deletion winner and advances its
  version.
- If an external transition arrives during restoration, discard the stale
  snapshot and reconcile the newest observed winner until one fenced pass
  completes without a version change. Do not claim completion under unbounded
  cross-context Auth churn, and never retry the Edge Function or deletion.
- Every RED command must execute a test body against a compile-complete seam
  and fail for the intended missing behavior. Import, type-resolution,
  configuration, and syntax errors are setup failures, not accepted RED proof.
- Never expose a token, password, email, user ID, session, request body, raw
  provider error, service-role value, or secret-key value in UI state, logs,
  fixtures, screenshots, evidence, commits, or chat.
- The Expo bundle gets only public Supabase configuration. The server-only
  credential remains inside the Edge runtime.
- Known offline state before dispatch preserves A. Post-dispatch transport
  loss is ambiguous. `validation-unavailable` is pre-revocation and preserves
  A. Gateway HTTP 401 is also pre-handler/pre-revocation even without JSON.
- Local JWT expiry remains 3,600 seconds. A human verifies staging is no more
  than one hour; existing access tokens can remain valid until `exp`.
- Agents may implement and run mocked/non-destructive checks. Agents/tools
  never execute account deletion on local, staging, or production.
- No deployment, hosted configuration write, staging/production access,
  commit, push, readiness transition, or merge is authorized by this plan.
- Every commit step is a checkpoint requiring separate user authorization.

## Execution Preconditions

- The planning documents were committed locally as
  `bd83038c9381231e59a1a53eca627180ba57b77e`. The implementation/correction
  candidate lives in `/private/tmp/eazy-review-task19-current-implementation`
  on `codex/task-19-guarded-account-deletion`; preserve the main checkout's
  unrelated untracked `.codex/` and do not resume the older Task 19 worktree.
- Keep implementation, correction, commit, push, exact-head CI, deployment,
  hosted configuration, destructive staging proof, acceptance, readiness,
  merge, and production as separate gates. The current authorization covers
  only this planning revision; product/test remediation requires a later
  explicit authorization after human plan approval.
- Re-read `AGENTS.md`, this plan, the human-reviewed revised spec,
  `docs/notes/handoff.md`, Task 19, and the two accepted account-deletion ADRs
  before edits.
- The prior implementation used an explicitly provisioned Deno 2.1.14 binary
  for `npm run check:functions`; bare `deno` is not assumed available in later
  sessions. Never silently download an installer, and do not turn a client-only
  correction into a Function/toolchain change.
- Apply the executable-code trust gate in `docs/AGENT_WORKFLOW.md` before tests.

## Current Primary References

- Auth headers and `verify_jwt`:
  <https://supabase.com/docs/guides/functions/auth-headers>
- Auth Admin sign-out/delete:
  <https://supabase.com/docs/reference/javascript/auth-admin-signout> and
  <https://supabase.com/docs/reference/javascript/auth-admin-deleteuser>
- Client session restoration and sign-out:
  <https://supabase.com/docs/reference/javascript/auth-setsession> and
  <https://supabase.com/docs/guides/auth/signout>
- JWT/AMR claims: <https://supabase.com/docs/guides/auth/jwt-fields>
- CORS and Deno tests: <https://supabase.com/docs/guides/functions/cors> and
  <https://supabase.com/docs/guides/functions/unit-test>
- Residual token behavior:
  <https://supabase.com/docs/guides/auth/managing-user-data>
- Deno CI: <https://docs.deno.com/runtime/reference/continuous_integration/>

## File Responsibility Map

| File | Responsibility |
| --- | --- |
| `supabase/functions/delete-current-user/contracts.ts` | Fixed server codes/results, Auth boundary, CORS/JSON response helper |
| `supabase/functions/delete-current-user/handler.ts` | Request/AMR validation and revoke/delete state machine |
| `supabase/functions/delete-current-user/handler_test.ts` | Mock-only orchestration matrix |
| `supabase/functions/delete-current-user/supabaseAuthAdminAdapter.ts` | Only SDK-call module |
| `supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts` | Exact SDK arguments/classification |
| `supabase/functions/delete-current-user/index.ts` | Thin environment/client/handler wiring |
| `supabase/functions/delete-current-user/deno.json`, `deno.lock` | Pinned Deno dependencies/tooling |
| `supabase/config.toml` | Explicit gateway JWT verification |
| `package.json`, `tsconfig.json`, `eslint.config.js`, Database CI | Deno lane and narrow Expo-tool exclusion |
| `src/features/auth/types.ts`, `errors.ts`, `api.ts`, `deletion.api.ts` | Token-free outcomes, injected-key precedence, exact recovery-predecessor capture/adoption, guarded explicit sign-in/bootstrap cleanup, internal reauth/invoke boundary |
| `src/features/auth/AuthProvider.tsx` | Principal binding, lock-before-arm sequencing, recovery-event authority, exact-displacement reconciliation, local settlement |
| `src/lib/supabase/authCoordination.ts` | Native/web non-stealing Auth-operation and storage locks |
| `src/lib/supabase/authStorage.ts` | Locked adapter, preparing/pending/settled guard, exact cleanup, settled/expired-pending predecessor capture, exact S2 adoption |
| `src/lib/supabase/createClient.ts`, `client.ts` | Stable storage key, isolated Auth/Functions factories, provider access |
| `src/lib/query/userScopedCache.ts` | Complete user-root cleanup plus deletion-safe principal-specific cleanup |
| `src/lib/query/keys.ts` | User-key shapes and accurate full-vs-principal cleanup ownership comment |
| `src/components/ui/Button.tsx` | Existing-token destructive variant |
| `app/(tabs)/account.tsx` | Inline confirmation and signed-out outcome copy |
| `supabase/tests/database/schema.test.sql` | Read-only Auth FK cascade proof |
| Canonical docs, ADR, Task 19 evidence | Contract and lifecycle truth |

---

### Task 1: Build and Validate the Protected Edge Function Boundary

**Files:**

- Create: `supabase/functions/delete-current-user/contracts.ts`
- Create: `supabase/functions/delete-current-user/handler.ts`
- Create: `supabase/functions/delete-current-user/handler_test.ts`
- Create: `supabase/functions/delete-current-user/supabaseAuthAdminAdapter.ts`
- Create: `supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts`
- Create: `supabase/functions/delete-current-user/index.ts`
- Create: `supabase/functions/delete-current-user/deno.json`
- Create: `supabase/functions/delete-current-user/deno.lock`
- Modify: `supabase/config.toml:386-395`
- Modify: `package.json:45-80`
- Modify: `tsconfig.json:12-18`
- Modify: `eslint.config.js:5-9`
- Modify: `.github/workflows/database-ci.yml:46-82`

**Interfaces:**

- Consumes: one user JWT in `Authorization`; built-in `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`; Supabase JS 2.112.0.
- Produces:

```ts
export type DeleteCurrentUserCode =
  | 'invalid-request'
  | 'unauthorized'
  | 'reauthentication-required'
  | 'validation-unavailable'
  | 'method-not-allowed'
  | 'configuration-failure'
  | 'revocation-failed'
  | 'revocation-unconfirmed'
  | 'revoked-not-deleted'
  | 'revoked-delete-unconfirmed';

export type VerificationResult<T> =
  | { kind: 'verified'; value: T }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };

export type RevokeResult =
  | { kind: 'revoked' }
  | { kind: 'session-absent' }
  | { kind: 'rejected' }
  | { kind: 'unconfirmed' };

export type DeleteResult =
  | { kind: 'deleted' }
  | { kind: 'already-absent' }
  | { kind: 'unconfirmed' };

export type LookupResult =
  | { kind: 'present' }
  | { kind: 'absent' }
  | { kind: 'unavailable' };

export type AuthBoundary = {
  getUser(jwt: string): Promise<VerificationResult<{ id: string }>>;
  getClaims(jwt: string): Promise<VerificationResult<Record<string, unknown>>>;
  signOutGlobal(jwt: string): Promise<RevokeResult>;
  deleteUser(userId: string): Promise<DeleteResult>;
  getUserById(userId: string): Promise<LookupResult>;
};

export function createDeleteCurrentUserHandler(dependencies: {
  auth: AuthBoundary;
  nowSeconds: () => number;
  logFixed: (code: string) => void;
}): (request: Request) => Promise<Response>;
```

- [ ] **Step 1: Add pinned Deno configuration**

Create:

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@1.0.14",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.112.0",
    "@supabase/supabase-js/cors": "npm:@supabase/supabase-js@2.112.0/cors"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.ns", "dom", "dom.iterable", "esnext"]
  },
  "fmt": { "include": ["./**/*.ts"], "lineWidth": 100, "singleQuote": true },
  "lint": { "include": ["./**/*.ts"], "rules": { "tags": ["recommended"] } },
  "test": { "include": ["./**/*_test.ts"] },
  "lock": { "path": "./deno.lock", "frozen": true }
}
```

Generate the lock after the minimal handler exists in Step 6. Keep the
checked-in configuration frozen; only that initial passing command overrides it.

- [ ] **Step 2: Write failing pure-handler tests**

Use `Deno.test`, injected fakes, and a call-order array. Include these exact
named cases:

```ts
const handlerCases = [
  'accepts unauthenticated OPTIONS with CORS and no Auth calls',
  'rejects non-POST methods with Allow POST OPTIONS',
  'accepts omitted and whitespace-only bodies',
  'rejects target-id JSON and every non-whitespace body',
  'rejects missing malformed duplicate and comma-joined Bearer headers',
  'maps invalid caller and unavailable verification separately',
  'rejects claim mismatch role session_id and every invalid AMR shape',
  'accepts password AMR at exactly 300 seconds and 60 seconds future',
  'orders getUser getClaims signOutGlobal deleteUser',
  'never deletes after validation AMR or revocation failure',
  'maps revoked absent rejected and unconfirmed revocation',
  'hard-deletes the exact verified caller once',
  'maps already absent and one post-error lookup honestly',
  'returns fixed JSON CORS no-store headers and fixed logs only',
] as const;
```

Use labels such as `caller-a` and `jwt-a`, never JWT-shaped or identity data.
Create the exact exported contract types and a compile-only handler seam before
the RED run. The seam returns fixed status `500` / code
`configuration-failure` for every request and performs no Auth call. It exists
only so the first OPTIONS assertion executes and reports expected `200` versus
received `500`; do not implement a validation or deletion branch yet.

- [ ] **Step 3: Run tests and confirm the intended failure**

```bash
deno test --no-lock \
  --config supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/handler_test.ts
```

Expected: FAIL in an executed OPTIONS assertion because the compile seam returns
`500` instead of `200`. A missing import, type error, config error, or syntax
error is not RED; fix only that setup and rerun. Grant no permissions and do
not create or mutate a lockfile during this red test.

- [ ] **Step 4: Implement response and AMR helpers**

```ts
import { corsHeaders } from '@supabase/supabase-js/cors';

export function jsonResponse(body: unknown, status: number, extra: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      ...Object.fromEntries(new Headers(extra)),
    },
  });
}

export function newestFreshPasswordTimestamp(amr: unknown, now: number): number | null {
  if (!Array.isArray(amr)) return null;
  const timestamps = amr.flatMap((entry) => {
    if (entry == null || typeof entry !== 'object') return [];
    const value = entry as { method?: unknown; timestamp?: unknown };
    return value.method === 'password' &&
        typeof value.timestamp === 'number' && Number.isFinite(value.timestamp)
      ? [value.timestamp]
      : [];
  });
  if (timestamps.length === 0) return null;
  const newest = Math.max(...timestamps);
  const age = now - newest;
  return age >= -60 && age <= 300 ? newest : null;
}
```

- [ ] **Step 5: Implement the pure state machine**

Run, in order: OPTIONS/method/body/Bearer checks; `getUser`; `getClaims`;
`sub === caller.id`; `role === 'authenticated'`; non-empty `session_id`; fresh
password AMR; global sign-out; hard delete; at most one lookup.

Exact mapping:

| Observation | Status/code | Delete? |
| --- | --- | --- |
| Bad method/body/Bearer | 400/401/405 fixed code | No |
| Invalid caller/claims | 401 `unauthorized` | No |
| Verification unavailable | 503 `validation-unavailable` | No |
| Bad AMR | 403 `reauthentication-required` | No |
| Revocation rejected | 502 `revocation-failed` | No |
| Session absent/unconfirmed revocation | 503 `revocation-unconfirmed` | No |
| Delete success/already absent | 200 `deleted` | Once/no retry |
| Delete uncertain + lookup absent | 200 `deleted` | No retry |
| Delete uncertain + lookup present | 409 `revoked-not-deleted` | No retry |
| Delete uncertain + lookup unavailable | 503 `revoked-delete-unconfirmed` | No retry |

OPTIONS is 200. A 405 includes `Allow: POST, OPTIONS`. Reject only when
`(await request.text()).trim().length > 0`. Log one fixed operation label and
one fixed outcome code, never an error object.

- [ ] **Step 6: Run handler tests and confirm PASS**

Run:

```bash
deno test --frozen=false \
  --config supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/handler_test.ts
```

Expected: every named case passes and `deno.lock` is generated from the exact
imports. Review the lock, then immediately rerun the same command with
`--frozen`; expect PASS with no lockfile change. Every later Deno command uses
frozen mode.

- [ ] **Step 7: Write failing adapter tests**

Use a fake with only:

```ts
type FakeAdminClient = {
  auth: {
    getUser(jwt: string): Promise<unknown>;
    getClaims(jwt: string): Promise<unknown>;
    admin: {
      signOut(jwt: string, scope: 'global'): Promise<unknown>;
      deleteUser(id: string, shouldSoftDelete: false): Promise<unknown>;
      getUserById(id: string): Promise<unknown>;
    };
  };
};
```

Prove exact arguments, returned-versus-thrown separation, stable name/code/
status classification, and no raw-message propagation.
Add a compile-only adapter factory whose five methods return the conservative
`unavailable` / `unconfirmed` variants without calling the fake. This lets the
exact-argument assertions execute and fail without a missing-module error; it
is replaced by Step 9.

- [ ] **Step 8: Run adapter test and confirm the intended failure**

```bash
deno test --frozen \
  --config supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts
```

Expected: FAIL in the first exact-call assertion because the compile seam made
no SDK call. Import, type, or configuration errors are setup failures and must
be corrected before recording RED.

- [ ] **Step 9: Implement the only SDK adapter**

Call exactly:

```ts
client.auth.getUser(jwt);
client.auth.getClaims(jwt);
client.auth.admin.signOut(jwt, 'global');
client.auth.admin.deleteUser(userId, false);
client.auth.admin.getUserById(userId);
```

Verification: stable rejection is `invalid`, thrown/5xx is `unavailable`.
Sign-out: only `AuthSessionMissingError`/`session_not_found` is absent; stable
400/422 is rejected; thrown, 5xx, 401, 403, 404, or unknown is unconfirmed.
Delete/lookup: only stable `user_not_found` proves absence. Read no raw message.

- [ ] **Step 10: Add thin runtime wiring and function config**

Create the server-only client lazily inside the request path:

```ts
createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
```

Missing/invalid runtime configuration returns only 500
`configuration-failure`; never print a name/value. Append:

```toml
[functions.delete-current-user]
verify_jwt = true
```

After every final SDK/runtime import exists, refresh the reviewed dependency
graph once and then prove it frozen:

```bash
deno check --frozen=false \
  --config supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/index.ts \
  supabase/functions/delete-current-user/handler_test.ts \
  supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts
deno check --frozen \
  --config supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/index.ts \
  supabase/functions/delete-current-user/handler_test.ts \
  supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts
```

Review the final `deno.lock`; the second command must not modify it.

- [ ] **Step 11: Add Deno scripts, narrow exclusions, and Database CI**

Add:

```json
{
  "check:functions:format": "deno fmt --check --config supabase/functions/delete-current-user/deno.json supabase/functions/delete-current-user",
  "check:functions:lint": "deno lint --config supabase/functions/delete-current-user/deno.json supabase/functions/delete-current-user",
  "check:functions:types": "deno check --frozen --config supabase/functions/delete-current-user/deno.json supabase/functions/delete-current-user/index.ts supabase/functions/delete-current-user/handler_test.ts supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts",
  "test:functions": "deno test --frozen --config supabase/functions/delete-current-user/deno.json supabase/functions/delete-current-user",
  "check:functions": "npm run check:functions:format && npm run check:functions:lint && npm run check:functions:types && npm run test:functions"
}
```

Add `tsconfig.json` and `eslint.config.js` to both the pull-request and
`master` push path filters in Database CI. The complete Task 1 packet already
touches `package.json` and `supabase/**`, but exclusion-only follow-ups must
still run the replacement Deno lane.

Add `"exclude": ["supabase/functions/delete-current-user/**/*.ts"]` to the
Expo tsconfig and add the same directory to ESLint ignores. Do not add the Deno
gate to `check:readonly`/Expo CI.

Before local Supabase startup in Database CI add:

```yaml
- name: Setup Deno
  uses: denoland/setup-deno@v2
  with:
    deno-version: v2.1.14
    cache: true

- name: Check Edge Functions
  run: npm run check:functions
```

- [ ] **Step 12: Run the server/static gates**

```bash
npm run check:functions
npm run typecheck
npm run lint
npm run check:secrets
git diff --check
```

Expected: PASS. If Deno is absent, mark Deno commands blocked; do not claim pass.

- [ ] **Step 13: Commit checkpoint, only when authorized**

```bash
git add .github/workflows/database-ci.yml eslint.config.js package.json \
  supabase/config.toml supabase/functions/delete-current-user tsconfig.json
git commit -m "feat: add protected deletion edge boundary"
```

### Task 2: Add the Token-Private Client Deletion API

**Files:**

- Create: `src/features/auth/deletion.api.ts`
- Create: `src/features/auth/deletion.api.test.ts`
- Modify: `src/features/auth/types.ts:39-86`
- Modify: `src/features/auth/errors.ts:1-99,250-415`
- Test: `src/features/auth/errors.test.ts`
- Modify: `src/lib/supabase/createClient.ts`
- Modify: `src/lib/supabase/client.test.ts`

**Interfaces:**

- Consumes: A's fixed email/ID, unchanged password, an isolated non-persisting
  Auth client for reauthentication, an isolated Functions client whose token
  provider is the fresh A bearer, and `DEFAULT_REQUEST_TIMEOUT_MS = 10_000`.
- Produces:

```ts
export type DeleteAccountOutcome =
  | { kind: 'deleted' }
  | { kind: 'not-deleted-signed-out' }
  | { kind: 'unconfirmed-signed-out' }
  | AuthOperationSuperseded;

export type AccountDeletionReauthentication = {
  user: AuthUser;
  accessToken: string;
};

export type DeleteCurrentUserApiOutcome =
  | { kind: 'deleted' }
  | { kind: 'not-deleted-signed-out' }
  | { kind: 'unconfirmed-signed-out' };

export type AccountDeletionApiOptions = {
  isOnline?: () => boolean;
  createIsolatedAuthClient?: () => AppSupabaseClient;
  createIsolatedFunctionsClient?: (
    accessToken: string,
  ) => Pick<AppSupabaseClient['functions'], 'invoke'>;
};

export async function reauthenticateForAccountDeletion(
  credentials: {
    email: string;
    password: string;
    expectedPrincipalId: string;
  },
  options?: AccountDeletionApiOptions,
): Promise<AccountDeletionReauthentication>;

export async function deleteCurrentUser(
  accessToken: string,
  options?: AccountDeletionApiOptions,
): Promise<DeleteCurrentUserApiOutcome>;
```

`accessToken` is internal to this module and AuthProvider; it never enters
`AuthContextValue`, component props, React state, or user copy.

- [ ] **Step 1: Write failing client-boundary tests**

Cover:

```ts
const clientCases = [
  'reauthenticates with fixed email and unchanged password bytes',
  'rejects a returned principal that differs from expected A before any adoption',
  'uses isolated non-persisting Auth state and never mutates the shared session',
  'returns the exact session bearer only to provider code',
  'rejects known offline state before either network call',
  'pins Authorization to the fresh bearer and omits body',
  'never asks shared auth getSession before the function fetch',
  'uses POST and the 10000 millisecond invocation timeout',
  'maps exact deleted retained-account and unconfirmed outcomes',
  'preserves A for every exact pre-revocation code',
  'treats a bodyless gateway 401 as pre-revocation unauthorized',
  'maps fetch relay timeout malformed unknown and mismatched responses ambiguous',
  'invokes the destructive endpoint exactly once',
  'never returns raw provider text or sensitive values',
] as const;
```

Use fake values such as `fresh-access-token-a`, never JWT-shaped fixtures.
Before the RED run, add the public outcome/type declarations plus compile-only
function seams: reauthentication returns a fixed token-free fake user and
internal fake bearer without calling Auth, while invocation returns
`unconfirmed-signed-out` without calling Functions. The first fixed-email SDK
assertion must therefore execute and fail; no real request or response decoder
exists yet.

- [ ] **Step 2: Run the client test and confirm the intended failure**

```bash
npm test -- --runInBand src/features/auth/deletion.api.test.ts
```

Expected: FAIL in the first fixed-email SDK-call assertion because the compile
seam made no Auth call. Missing-module, import, type, or syntax errors are setup
failures and must be corrected before recording RED.

- [ ] **Step 3: Complete safe error contracts**

Keep the compile-complete outcome union introduced for RED. Extend
`AuthErrorCode` with:

```ts
| 'account-deletion-failed'
| 'account-deletion-in-progress';
```

Extend `AuthNormalizeOperation` with
`'account-deletion-reauthentication'`, and add exact copy:

```ts
accountDeletionWrongPassword: 'Current password is incorrect.',
accountDeletionFailed: 'Could not delete your account. Please try again.',
accountDeletionInProgress: 'Account deletion is already in progress.',
```

Invalid credentials during deletion reauthentication keep code
`invalid-credentials` but use the current-password message. Known
pre-revocation endpoint errors use `account-deletion-failed`; offline retains
the existing offline message.

- [ ] **Step 4: Implement reauthentication without exposing the session**

Create one isolated public-config Auth client with memory-only storage,
`persistSession: false`, `autoRefreshToken: false`, and
`detectSessionInUrl: false`. Call once and dispose it in `finally`:

```ts
const { data, error } = await isolatedClient.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});
```

Require `session.user`, `session.user.id === credentials.expectedPrincipalId`,
and a non-empty `session.access_token` before returning; map only the token-free
user plus internal bearer. Do not wrap the unabortable password request in a
timeout race; await/dispose the isolated client, and let provider attempt-
generation checks discard a stale result without shared-state mutation.

- [ ] **Step 5: Implement exact-bearer invocation and decoding**

Create an isolated Functions client from the validated public URL/key with an
`accessToken` callback that returns only the fresh A bearer. Do not reuse the
application Supabase client: pinned `fetchWithAuth` calls its token provider
before inspecting invocation headers, which would consult shared Auth and
reenter the held Auth-operation lock.

```ts
const result = await isolatedFunctionsClient.invoke('delete-current-user', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
});
```

Do not include `body`. Decode only:

```ts
const exactOutcomes = new Map<string, DeleteCurrentUserApiOutcome>([
  ['200:deleted', { kind: 'deleted' }],
  ['409:revoked-not-deleted', { kind: 'not-deleted-signed-out' }],
  ['503:revocation-unconfirmed', { kind: 'unconfirmed-signed-out' }],
  ['503:revoked-delete-unconfirmed', { kind: 'unconfirmed-signed-out' }],
]);

const preRevocationPairs = new Set([
  '400:invalid-request',
  '401:unauthorized',
  '403:reauthentication-required',
  '405:method-not-allowed',
  '500:configuration-failure',
  '502:revocation-failed',
  '503:validation-unavailable',
]);
```

A malformed HTTP 401 throws a fixed pre-revocation error because gateway JWT
verification runs before the handler. Every other malformed body,
unknown/mismatched pair, fetch/relay error, or timeout returns
`unconfirmed-signed-out`. Never retry.

Inspect non-2xx JSON only for `FunctionsHttpError`, using a clone of its
returned `Response`. `FunctionsFetchError` and `FunctionsRelayError` are always
ambiguous even if their context resembles a response. A 200 success requires
`ok === true` and `outcome === 'deleted'`; a fixed error requires
`ok === false` plus the exact HTTP/code pair. Never accept raw text.

- [ ] **Step 6: Run client/error tests and static checks**

```bash
npm test -- --runInBand \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/errors.test.ts
npm run typecheck
npm run lint
```

Expected: PASS; no public type contains a bearer/session field.

- [ ] **Step 7: Commit checkpoint, only when authorized**

```bash
git add src/features/auth/deletion.api.ts \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/errors.ts src/features/auth/errors.test.ts \
  src/features/auth/types.ts src/lib/supabase/createClient.ts \
  src/lib/supabase/client.test.ts
git commit -m "feat: add account deletion client contract"
```

### Task 3: Integrate Principal-Bound Storage and Provider-Owned Deletion

**Files:**

- Create: `src/features/auth/AuthProvider.deletion.test.tsx`
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/AuthProvider.test.tsx`
- Modify: `src/features/auth/api.ts`
- Modify: `src/features/auth/api.test.ts`
- Modify: `src/features/auth/recovery.api.test.ts`
- Modify: `src/features/auth/deletion.api.ts`
- Modify: `src/features/auth/deletion.api.test.ts`
- Create: `src/lib/supabase/authCoordination.ts`
- Create: `src/lib/supabase/authCoordination.test.ts`
- Modify: `src/lib/supabase/authStorage.ts`
- Modify: `src/lib/supabase/authStorage.test.ts`
- Modify: `src/lib/supabase/createClient.ts`
- Modify: `src/lib/supabase/client.ts`
- Modify: `src/lib/supabase/client.test.ts`
- Modify: `src/lib/query/keys.ts` (comment only; no key-shape change)
- Modify: `src/lib/query/userScopedCache.ts`
- Modify: `src/lib/query/userScopedCache.test.ts`

**Interfaces:**

- Consumes:

```ts
reauthenticateForAccountDeletion(
  { email, password, expectedPrincipalId },
  deletionApiOptions,
);
deleteCurrentUser(accessToken, deletionApiOptions);
prepareUserScopedCacheForPrincipal(nextUserId);
beginExplicitAuthOperation();
```

- Produces:

```ts
deleteAccount: (password: string) => Promise<DeleteAccountOutcome>;

export type PrincipalBoundSessionCleanup =
  | {
      kind: 'removed-a' | 'already-empty';
      companionCleanup: 'removed' | 'unconfirmed';
    }
  | { kind: 'quarantined-unavailable' }
  | { kind: 'stale-attempt' }
  | { kind: 'preserved-guarded'; principalId: string }
  | {
      kind: 'preserved-winner';
      principalId: string;
      session: Session;
    };

export function deriveSupabaseAuthStorageKey(supabaseUrl: string): string;
export function getSupabaseAuthStorageKey(): string;
export async function preflightPrincipalBoundAuthStorage(
  storageKey: string,
  principalId: string,
): Promise<'ready' | 'guard-busy'>;
export async function armPrincipalDeletionGuard(
  storageKey: string,
  principalId: string,
): Promise<
  | { kind: 'armed'; guardRevision: number }
  | { kind: 'guard-busy' }
  | { kind: 'unavailable' }
  | { kind: 'quarantine-unconfirmed' }
  | { kind: 'preserved-guarded'; principalId: string }
  | {
      kind: 'preserved-winner';
      principalId: string;
      session: Session;
    }
>;
export async function settleGuardedPrincipalSession(
  storageKey: string,
  principalId: string,
  guardRevision: number,
): Promise<PrincipalBoundSessionCleanup>;
export async function markPrincipalDeletionDispatched(
  storageKey: string,
  principalId: string,
  guardRevision: number,
): Promise<
  | 'pending'
  | 'stale-attempt'
  | 'unconfirmed'
  | { kind: 'signed-out' }
  | { kind: 'preserved-guarded'; principalId: string }
  | {
      kind: 'preserved-winner';
      principalId: string;
      session: Session;
    }
>;
export async function settlePrincipalDeletionGuard(
  storageKey: string,
  principalId: string,
  guardRevision: number,
): Promise<'settled' | 'stale-attempt' | 'unconfirmed'>;
export async function disarmPrincipalDeletionGuard(
  storageKey: string,
  principalId: string,
  guardRevision: number,
): Promise<
  | { kind: 'disarmed' }
  | { kind: 'unconfirmed' }
  | { kind: 'stale-attempt' }
  | { kind: 'preserved-guarded'; principalId: string }
  | {
      kind: 'preserved-winner';
      principalId: string;
      session: Session;
    }
>;
export async function removeStoredSessionIfExact(
  storageKey: string,
  expected: {
    principalId: string;
    accessToken: string;
    refreshToken: string;
  },
): Promise<'removed' | 'changed' | 'already-empty' | 'unavailable'>;
export function isSessionBlockedByDeletionGuard(
  storageKey: string,
  session: Session,
): Promise<boolean>;

type ExactStoredSessionSnapshot = {
  principalId: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

type ExactRecoveryGuardSnapshot = {
  principalId: string;
  revision: number;
  state: 'settled' | 'pending';
  leaseExpiresAt: number;
  allowedSessionId: string | null;
  predecessor:
    | null
    | { state: 'settled'; allowedSessionId: string | null };
};

export type RecoveryAdoptionPredecessor =
  | {
      kind: 'settled-allowed';
      guard: ExactRecoveryGuardSnapshot & {
        state: 'settled';
        allowedSessionId: string;
      };
      raw: { kind: 'session'; snapshot: ExactStoredSessionSnapshot };
    }
  | {
      kind: 'expired-pending';
      guard: ExactRecoveryGuardSnapshot & {
        state: 'pending';
        allowedSessionId: null;
      };
      raw:
        | { kind: 'empty' }
        | { kind: 'session'; snapshot: ExactStoredSessionSnapshot };
    };

export type RecoveryPredecessorCapture =
  | RecoveryAdoptionPredecessor
  | { kind: 'not-guarded' }
  | { kind: 'guard-busy' }
  | { kind: 'superseded' }
  | { kind: 'unavailable' };

export async function captureRecoveryAdoptionPredecessor(
  storageKey: string,
): Promise<RecoveryPredecessorCapture>;

export async function adoptExplicitSessionAfterDeletionGuard(
  storageKey: string,
  session: Session,
): Promise<
  'not-guarded' | 'adopted' | 'guard-busy' | 'superseded' | 'unconfirmed'
>;
export async function adoptRecoverySessionAfterDeletionGuard(
  storageKey: string,
  predecessor: RecoveryAdoptionPredecessor,
  returnedSession: Session,
): Promise<'adopted' | 'guard-busy' | 'superseded' | 'unconfirmed'>;

export type GuardedAuthStorageReconciliation =
  | { kind: 'empty'; guardedPrincipalIds: string[] }
  | { kind: 'unavailable' }
  | {
      kind: 'blocked';
      principalId: string;
      guardRevision: number;
      guardState: 'preparing' | 'pending' | 'settled';
    }
  | {
      kind: 'allowed-session';
      principalId: string;
      session: Session;
      sessionId: string | null;
      guardRevision: number | null;
    };

export async function replaceDisplacedSessionIfExact(
  storageKey: string,
  expectedDisplaced: Session,
  validatedReplacement: Session,
): Promise<GuardedAuthStorageReconciliation>;
export async function runSupabaseAuthOperation<T>(
  storageKey: string,
  operation: () => Promise<T>,
): Promise<T>;
export async function reconcileGuardedSignedOutEvent(
  storageKey: string,
): Promise<GuardedAuthStorageReconciliation>;
export function subscribePrincipalDeletionGuardChanges(
  storageKey: string,
  onChange: () => void,
): () => void;
export async function reconcileGuardedAuthStorage(
  storageKey: string,
): Promise<GuardedAuthStorageReconciliation>;

export type ExactLocalSignOutResult =
  | { kind: 'signed-out' }
  | { kind: 'superseded'; user: AuthUser };

export async function signOut(
  options?: AuthApiOptions,
): Promise<ExactLocalSignOutResult>;
export async function validateSessionSnapshotIsolated(
  session: Session,
  options?: AuthApiOptions,
): Promise<
  | { kind: 'valid'; user: AuthUser }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
>;

removePrincipalScopedQueries(
  queryClient: QueryClient,
  principalId: string,
): Promise<void>;
```

- Provider-private authority types:

```ts
type DeletionWinner =
  | {
      kind: 'session';
      version: number;
      principalId: string;
      session: Session;
    }
  | { kind: 'signed-out'; version: number };

type ActiveDeletionAttempt = {
  generation: number;
  authGenerationAtStart: number;
  principalId: string;
  principalEmail: string;
  guardRevision: number | null;
  winnerVersion: number;
  winner: DeletionWinner | undefined;
};

type RecoveryDisplacement =
  | {
      kind: 'exact';
      principalId: string;
      session: Session;
      sessionId: string;
      guardRevision: number | null;
    }
  | { kind: 'unknown'; principalId: string | null };

type GuardReconciliationRequest =
  | { kind?: 'ordinary' }
  | {
      kind: 'forced-recovery';
      displacement: RecoveryDisplacement;
    };
```

- [ ] **Step 1: Write failing storage, recovery, cache, and provider tests**

Keep deletion-only provider coverage in `AuthProvider.deletion.test.tsx`. Add
recovery-arbitration regressions to the existing `AuthProvider.test.tsx` and
`recovery.api.test.ts`; add raw transaction coverage to `authStorage.test.ts`.
Use deferred promises and seed `accountKeys`, `ratingKeys`, and `catalogKeys`.
Cover:

```ts
const storageCases = [
  'derives the explicit key already used by Supabase for local and hosted URLs',
  'uses explicit storageKey then injected client then public singleton precedence',
  'acquires the real lock asynchronously before reauthentication',
  'serializes adapter get set remove and guard transactions with one injected lock',
  'arms and readbacks preparing A guard before reauthentication',
  'uses preparing then readback pending before the server call',
  'rolls back expired preparing but keeps expired pending quarantined',
  'normalizes expired preparing during offline read sign-in and recovery adoption',
  'does not dispatch when isolated reauth returns after preparing revision expired',
  'allows explicit adoption only after pending lease expiry',
  'expired-pending adoption advances revision and stales the old attempt',
  'distinguishes pre-write unavailable from unconfirmed marker commit',
  'pending guard hides A offline and ignores late A writes',
  'fails closed for guarded A with missing or malformed session_id claim',
  'denies stale SDK primary and companion removal while guards exist',
  'reconciles false SIGNED_OUT to stored allowed B without removing B',
  'isolated-validates stored B before accepting false SIGNED_OUT reconciliation',
  'exact-removes definitively invalid B and preserves B on transient validation',
  'restarts SIGNED_OUT reconciliation when C replaces B during validation',
  'isolated bearer validation cannot mutate shared storage',
  'isolated exact local sign-out preserves C replacing captured B',
  'local sign-out remote failure removes only the unchanged captured session',
  'uses non-stealing Auth-operation then storage lock order',
  'pending restart remains quarantined instead of republishing A',
  'settled guard ignores a refresh paused after its final storage read',
  'blocked A Auth events are ignored while B events remain authoritative',
  'removes the session and companion user slot only when stored principal is A',
  'returns already-empty without a removal',
  'preserves stored B and returns its exact snapshot before its Auth event arrives',
  'serializes B writing between A comparison and removal',
  'represents companion failure after primary removal without claiming no change',
  'keeps pending quarantine for malformed storage or post-dispatch failure',
  'disarms owned preparing or pending guard only for unchanged A after pre-revocation failure',
  'keeps guard armed when B supersedes A before disarm',
  'adopts only the exact session_id from a later explicit A sign-in',
  'adopts the returned non-empty session_id from verified A recovery only through an exact predecessor',
  'captures exact settled allowed S1 plus guard revision before recovery exchange',
  'adopts settled S2 by replacing exact raw S1',
  'accepts same-session-ID S2 when raw already equals exact returned S2 without a redundant primary write',
  'preserves A2 C empty malformed blocked changed and unavailable settled authority',
  'captures exact lease-expired-pending session and empty predecessors',
  'adopts expired-pending S2 only while exact guard and raw predecessor remain current or raw is already exact S2',
  'preserves changed malformed unavailable or newly blocked expired-pending authority',
  'never persists the operation-local recovery predecessor in guard JSON',
  'does not adopt sign-in or recovery while the guard is unexpired preparing or pending',
  'retains A guard when later B guard is armed',
  'deduplicates repeated guard updates for one principal without dropping others',
  'returns guard-busy for a concurrent same-principal pending attempt',
  'stale settle and disarm cannot mutate a newer guard revision',
  'never reuses a revision after a guard record is removed and rearmed',
  'pre-revocation rollback restores the predecessor settled lineage',
  'replaces exact allowed displaced A with validated B once',
  'preserves raw C and newer same-principal A2 before replacement',
  'preserves empty malformed and blocked raw authority without a write',
  'does not write B when B is blocked by its own guard',
  'reports uncertain replacement readback without retry',
  'rejects an actual web lock request failure before reauthentication',
  'never logs a token session principal or raw stored value',
] as const;

const coordinationCases = [
  'uses distinct stable Auth-operation and storage lock names',
  'uses process-wide serialization on native',
  'uses non-stealing Web Locks without positive-timeout recovery',
  'keeps nested order Auth operation then storage',
  'releases storage capability preflight before waiting on Auth operation',
  'queues guard arm behind earlier Auth work and nests its storage transaction under Auth operation',
  'broadcasts one payload-free guard change across web contexts',
  'uses one process emitter for native providers',
  'requires Web Locks and BroadcastChannel before web guard arm',
  'delivers native guard changes asynchronously after caller revision capture',
] as const;

const recoveryApiCases = [
  'keeps unguarded recovery on the existing exact post-SDK adoption path',
  'captures predecessor before PKCE exchange and adopts only after exchange returns',
  'captures predecessor before token setSession and adopts only after setSession returns',
  'passes exact settled S1 and returned S2 to the serialized recovery adoption boundary',
  'accepts returned S2 whose session ID equals S1 while exact snapshot bytes differ',
  'returns superseded busy or unconfirmed without claiming recovery success',
] as const;

const providerCases = [
  'deletes A with the fresh bearer and retains catalog cache',
  'rejects unsupported web storage coordination before reauth or invocation',
  'isolated reauthentication emits no shared SIGNED_IN or storage write',
  'preserves A and A cache after wrong password offline and pre-revocation failure',
  'settles A signed out for deleted retained-account and unconfirmed outcomes',
  'settles A without calling shared-client auth signOut',
  'arms preparing inside a short Auth-operation section before reauth',
  'preserves A2 persisted by an already-running refresh after confirmed pre-revocation rollback',
  'keeps post-arm A writes and events quarantined',
  'handles preserved-winner and quarantine arm outcomes only after the short Auth lock releases',
  'readbacks pending before invocation',
  'does not invoke when guard arm or readback fails',
  'keeps A quarantined after a crash-shaped pending restart',
  'ignores late TOKEN_REFRESHED A after local settlement',
  'preserves B when stale A getUser fails immediately before SDK removal',
  'preserves B when stale A refresh fails immediately before SDK removal',
  'reconciles sessionless SIGNED_OUT against guarded storage before authority',
  'clears A state and only A cache in a second tab after a blocked settled guard change with no matching allowed lineage',
  'restores exact allowed A in a second tab after pre-revocation disarm',
  'reconciles guard authority on mount signal and foreground',
  'returns from Auth callback before deferred reconciliation acquires Auth lock',
  'serializes deferred Auth events guard signals and foreground in one tail',
  'keeps initiating native A pending on self-arm and self-foreground',
  'clears the same blocked A in every non-owner provider revision',
  'ordinary local sign-out preserves a replacement principal and its cache',
  'recovery cleanup uses isolated token pinning and exact local removal',
  'contains no shared-client auth signOut cleanup call in app Auth source',
  'promotes stored B before its delayed Auth event and never revokes or removes B',
  'rejects duplicate provider deletion while the first is pending',
  'does not invoke when B supersedes A during reauthentication',
  'keeps the server request pinned to A when B arrives during invocation',
  'preserves or restores B when B arrives during A cleanup',
  'keeps signed-out authoritative when B signs out before A settles',
  'classifies B then SIGNED_OUT while A settlement is pending as signed-out',
  'keeps C authoritative when stored before or during B winner reconciliation',
  'does not publish B when B becomes guarded after capture before publication',
  'classifies a newer same-principal B session during restore as a new winner',
  'keeps B2 authoritative when raw B2 replaces captured B1',
  'restarts restoration from the newest version after an external transition',
  'performs no SDK session write during deletion winner restoration',
  'serializes superseded-recovery CAS behind provider and Auth-operation locks',
  'prevents late A cleanup from removing or repopulating B or C queries',
  'never falls back to shared signOut after storage cleanup failure',
  'post-finalization reconciliation clears initiating A after stale or unconfirmed disarm',
  'offline bootstrap never publishes guarded residual A',
  'online invalid bootstrap cleanup preserves B arriving after validation',
  'later explicit A sign-in adopts only its returned non-empty session lineage',
  'later verified A recovery adopts returned S2 only through an exact predecessor',
  'prefers injected storage key over configured public Supabase environment',
  'keeps recovery-owned S2 maintenance-only until exact adoption succeeds',
  'adopts settled S2 from raw exact S1 or already exact S2 without transient publication',
  'preserves valid S1 and its principal cache when forced recovery has no exact displaced snapshot',
  'validates and exact-rechecks unknown-displacement S1 before republishing it',
  'preserves A2 C empty malformed blocked and unavailable authority without cleanup',
  'handles exact lease-expired-pending session and empty predecessors without relabeling the server outcome',
  'rejects mismatched reauth B before changing any guard record',
  'does not publish residual B when B is blocked by its own guard',
  'waits for recovery reconciliation before deletion',
  'marks reauthentication explicit when a recovery callback overlaps deletion',
  'exposes no password bearer session or raw error through context',
] as const;
```

Use a non-reentrant mock Auth lock and assert exact guard-arm choreography:

```txt
earlier Auth start
storage capability preflight start/end
earlier Auth persists exact A2 and ends
arm Auth section enters at lock depth 1
arm storage transaction enters/exits
arm Auth section exits
isolated reauthentication begins at lock depth 0
```

While `preparing` is active, attempt A3 storage/event publication and prove both
are quarantined. Force a confirmed pre-revocation failure and assert no
destructive request, exact-revision disarm, exact raw/readable A2, signed-in A,
retained A cache, and zero shared-sign-out calls. Exercise `preserved-winner`
and `quarantine-unconfirmed` arm results and assert their provider reconciliation
starts only at Auth-lock depth 0; the non-reentrant lock must fail any accidental
depth-2 acquisition.

For recovery, assert exact call order `capture predecessor -> PKCE exchange or
token setSession -> adopt(predecessor, S2)`. Table-drive settled raw S1, already-
exact S2, same-session-ID S2, A2, C, empty, malformed, blocked, changed guard,
and unavailable storage. Separately table-drive lease-expired-pending captured
session, captured empty, already-exact S2, changed, malformed, unavailable, and
newly blocked states. Each non-success case must prove zero primary/guard/
companion mutation. Force an `unknown` displacement with valid allowed S1 and
assert exact S1 remains stored, is isolated-validated/rechecked, is republished
as signed-in A with idle recovery, retains A cache, and never publishes a
signed-out or recovery-verified intermediate state.

Extend `userScopedCache.test.ts` with exact cases proving that A-only cleanup:

```ts
const principalCacheCases = [
  'cancels then removes only A account and rating keys',
  'retains B account and rating keys',
  'retains catalog and unknown key families',
  'keeps complete root cleanup unchanged for ordinary sign-out',
] as const;
```

Use a test-only narrow context cast for the first provider RED assertion.
Create compile-only seams whose guard arm returns `unavailable`, whose cleanup
returns `quarantined-unavailable`, and whose
principal cache cleanup performs no removal. The first provider assertion must
receive `undefined` for `deleteAccount`, the first A-removal assertion must
still find A in storage, and the first cache assertion must still find A's key.
Missing imports/types, invalid mocks, and syntax errors are setup failures, not
RED proof.

- [ ] **Step 2: Run storage, API, provider, and cache surfaces and confirm RED**

```bash
npm test -- --runInBand \
  src/lib/supabase/authCoordination.test.ts \
  src/lib/supabase/authStorage.test.ts \
  src/lib/supabase/client.test.ts \
  src/features/auth/api.test.ts \
  src/features/auth/recovery.api.test.ts \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/AuthProvider.deletion.test.tsx \
  src/features/auth/AuthProvider.test.tsx \
  src/lib/query/userScopedCache.test.ts
```

Expected: FAIL in executed assertions because provider resolution selects the
ambient key, guard arm enters before the earlier Auth operation drains, settled
S1 recovery does not adopt exact S2, and unknown displacement removes or signs
out valid S1. Correct only compile/setup failures until those named behavioral
assertions execute and fail.

- [ ] **Step 3: Implement the locked two-phase deletion guard**

Keep the existing AsyncStorage backend and public adapter shape. Add one
application-owned exclusive lock name and run every adapter `getItem`,
`setItem`, and `removeItem`, plus every deletion-guard transaction, through it.
Native uses a promise-tail/process lock. Web uses
`navigator.locks.request()` directly without lock stealing. Ordinary auth may
retain the existing process-local fallback when Web Locks are unavailable, but
`preflightPrincipalBoundAuthStorage()` must make an actual asynchronous Web
Lock request and reject before reauthentication if acquisition is unavailable.

Add a distinct non-stealing Auth-operation lock and pass it to pinned Auth JS
as `auth.lock` with `lockAcquireTimeout: -1`. `runSupabaseAuthOperation` uses
the exact SDK name `lock:${storageKey}`. Deletion uses it in two bounded
critical sections. After storage capability preflight completes and releases
storage, the first section acquires `Auth operation -> storage` for guard arm
and readback, so earlier SDK Auth work settles before arm. That section returns
the arm result and releases before provider reconciliation or isolated
reauthentication. The second section begins at the final post-reauthentication
check and covers pending transition, server result, guard transition/disarm,
and local settlement. Every combined path uses `Auth operation -> storage`; no
path waits for Auth operation while holding storage.

Derive and explicitly pass the exact SDK-compatible key:

```ts
export function deriveSupabaseAuthStorageKey(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}
```

`getSupabaseAuthStorageKey()` derives from the same validated public URL used by
the singleton. `createAppSupabaseClient` passes that key as `auth.storageKey`;
the value is identical to the existing SDK default, so no migration or forced
sign-out occurs.

Provider resolution is injection-first:

```ts
function resolveProviderStorageKey(
  clientProp: AppSupabaseClient | null | undefined,
): string {
  if (clientProp !== undefined) return 'sb-injected-auth-token';
  return getSupabaseAuthStorageKey();
}
```

Auth API uses the equivalent precedence: `options.storageKey`, then the
injected-client key, then the singleton key. Ambient public environment never
overrides injection.

Use `${storageKey}-eazy-review-deletion-guard` for a local JSON record:

```ts
type PrincipalDeletionGuardStore = {
  version: 1;
  nextRevision: number;
  records: Array<{
    revision: number;
    state: 'preparing' | 'pending' | 'settled';
    leaseExpiresAt: number;
    principalId: string;
    allowedSessionId: string | null;
    predecessor: null | {
      state: 'settled';
      allowedSessionId: string | null;
    };
  }>;
};
```

It stores no token, email, password, profile/rating data, note, or response.
Records are keyed/deduplicated by principal; arming B never drops an existing A
record. `nextRevision` advances store-wide under the lock, even when a record is
removed, so a future attempt never reuses a stale tab's revision.
Use exact local lease constant `DELETION_GUARD_LEASE_MS = 5 * 60_000`.
Add an internal JWT-payload decoder that extracts only a non-empty `session_id`
and matching `sub` for local lineage classification; it never authorizes a
request or logs input. Missing/malformed claims fail closed for guarded A.

For the primary Auth session key, adapter operations read the guard inside the
same lock:

- `getItem`: return `null` for guarded A unless its `session_id` equals
  `allowedSessionId`; return B/allowed A unchanged;
- `setItem`: no-op for blocked A writes that reach the adapter after guard arm,
  including SDK methods that do not participate in the shared Auth-operation
  lock; allow B/allowed A; and
- `removeItem`: while any guard record exists, deny direct SDK removal of the
  primary session and companion user slot. Application-owned exact transactions
  use the raw store under lock; unrelated PKCE-key cleanup remains independent.

After the separate storage capability preflight has completed and released,
`armPrincipalDeletionGuard` runs inside the short Auth-operation critical
section and before isolated reauthentication. It nests only the storage lock,
reads the latest authority after earlier Auth work has drained, requires stored
A, writes and exactly reads back a leased `preparing` guard, and returns its
operation-local result. Provider reconciliation and arm-result settlement run
only after the Auth-operation lock releases. An unexpired preparing/pending A
returns `guard-busy`; prior settled, preserved-winner, preserved-guarded,
unavailable, and quarantine-unconfirmed behavior remains unchanged. Neither a
failed/unconfirmed arm nor an arm result other than `armed` permits the Edge
call.

After isolated reauthentication and the final winner check,
`markPrincipalDeletionDispatched` changes the exact revision from `preparing`
to a newly leased `pending`, reads it back, and only then permits the Edge call.
A stale/unconfirmed transition performs no server call.

`settlePrincipalDeletionGuard` changes `pending` to `settled` only when the
revision equals this attempt. Failure leaves `pending` equally blocking.
`disarmPrincipalDeletionGuard` compares the same revision and, after a fixed
pre-revocation failure, restores the saved predecessor with a newly advanced
revision; it removes the record only when no predecessor existed and unchanged
A remains with no winner. A stale revision is a no-op. It keeps the guard when B
is stored. A failed disarm is a safe local quarantine. Arm waits for earlier
Auth work, so a refresh-held A1 may first persist exact A2; disarm mutates only
the owned guard revision and leaves A2 raw/readable while A remains
authoritative.

Preflight rolls back an expired `preparing` record to its predecessor because
dispatch was never authorized. An unexpired `preparing`/`pending` returns
`guard-busy`. A lease-expired `pending` remains quarantined but may adopt a
fresh explicitly verified sign-in/recovery session; adoption does not resolve
or retry the old server attempt.

Implement expired-`preparing` rollback through one common normalization helper
invoked inside every primary-session adapter `getItem`/`setItem`, preflight, and
adoption—not only Delete preflight. Restore the predecessor with a new store-
wide revision or remove the record when none existed, so offline restart,
ordinary sign-in, and recovery self-heal even when no Delete UI is reachable.
Expired `pending` is never normalized away.

`settleGuardedPrincipalSession` uses the raw injected store inside the lock:

1. missing primary -> `already-empty`, then best-effort companion removal;
2. malformed primary -> `quarantined-unavailable`, no primary removal;
3. valid non-A allowed by its own guard -> `preserved-winner`, no removal;
4. valid non-A blocked by its own guard -> `preserved-guarded`, no removal;
5. valid A -> remove the primary, then attempt `${storageKey}-user` separately.

The cleanup also compares the exact guard revision. `stale-attempt` performs no
write and cannot settle/remove state owned by a newer tab.

Once the primary is removed, return `removed-a` even if companion cleanup fails;
represent that with `companionCleanup: 'unconfirmed'`. Never relabel partial
commit as `unavailable`.

`removeStoredSessionIfExact` replaces definitive-invalid bootstrap's shared
sign-out. Under the same lock it removes only when principal, access token, and
refresh token still match the restored snapshot; B or a newer same-principal
session returns `changed` untouched.

Create an isolated non-persisting Auth client from the validated public URL/key.
Bootstrap validates the captured bearer on that client, so an SDK
`AuthSessionMissingError` can clear only memory. Ordinary local sign-out and
recovery failure cleanup likewise send the captured bearer through isolated
`auth.admin.signOut(jwt, 'local')`, then exact-remove shared storage. No shared
`client.auth.signOut` call remains. If shared storage changed to B/C, return a
token-free `superseded` result and let provider arbitration preserve it. Run
each exact validate/revoke/remove sequence inside `runSupabaseAuthOperation` so
main-client refresh/getUser work cannot commit after cleanup.

Ordinary local sign-out/recovery cleanup attempts isolated revoke once, never
retries, and exact-removes the captured local snapshot even when that remote
call fails; this matches current local intent without touching another
principal. Return `superseded` when the exact snapshot changed. Log only fixed
outcome labels, never the remote error.

`adoptExplicitSessionAfterDeletionGuard` retains the exact later-human-sign-in
path. Verified Task 18 recovery uses the separate predecessor-bound functions.
Before the unabortable exchange, call
`captureRecoveryAdoptionPredecessor(storageKey)` under storage. A usable capture
is either exact guard-allowed settled S1 plus guard revision or exact lease-
expired pending guard plus raw same-principal session/empty state. Keep the
capture operation-local; never serialize it into guard JSON, React/context,
logs, evidence, or a public callback result.

Capture classifies `settled-allowed` only when guard principal matches raw S1
and non-null `allowedSessionId === raw.sessionId`. It classifies
`expired-pending` only when the matching guard is pending, has null allowed
lineage, and `leaseExpiresAt <= now()` at capture. `not-guarded` continues the
existing recovery flow: complete the SDK exchange, then call
`adoptExplicitSessionAfterDeletionGuard(storageKey, S2)` for the exact post-SDK
authority check. Only `settled-allowed` and `expired-pending` call
`adoptRecoverySessionAfterDeletionGuard`. `guard-busy`, `superseded`, and
`unavailable` stop before exchange with fixed safe non-success handling and
never claim recovery success.

After the callback SDK writer releases, pass the capture and returned S2 to
`adoptRecoverySessionAfterDeletionGuard` under the provider writer FIFO and
`Auth operation -> storage`. S2 must have the same subject and a non-empty
session ID, but that ID may equal S1's. Settled adoption succeeds only when the
guard remains exact and raw storage is exact captured S1 or already exact
returned S2. Lease-expired-pending adoption succeeds only when its exact guard
and captured session/empty raw state remain current, or raw is already exact
S2. Every success allocates a new settled revision, allows S2, writes S2 only
when needed, exact-readbacks guard plus primary storage, and emits the payload-
free signal.

Any nonmatching A2/C/empty/malformed/newly-blocked/changed/unavailable settled
state, or changed/malformed/unavailable/newly-blocked expired-pending state,
returns `superseded`, `guard-busy`, or `unconfirmed` without guard/session
mutation. An unexpired preparing/pending record remains `guard-busy`. Public
Auth/callback results stay token/session-free, stale lineages stay blocked, and
adoption never resolves or relabels an older pending server outcome.

`isSessionBlockedByDeletionGuard` reads the guard under the lock before the
provider applies an Auth event. This prevents a quarantined
`SIGNED_IN`/`TOKEN_REFRESHED` event from republishing A even though Auth JS emits
after an adapter write was ignored. B events continue normally.

Create a payload-free guard-change channel named from `storageKey`: Web
BroadcastChannel plus native process emitter. Web preflight requires both this
channel and Web Locks. Emit `{ version: 1, kind: 'changed' }` after every
successful or unconfirmed arm/state transition/disarm/adoption,
expired-preparing normalization, and guarded primary cleanup; never include a
principal/session/outcome. `subscribePrincipalDeletionGuardChanges` returns an
unsubscribe function.

`AuthProvider` subscribes once and runs the same reconciliation on mount,
notification, and foreground. `reconcileGuardedAuthStorage` rereads exact guard
and raw storage: clear only a displayed blocked/removed principal and its Query
keys, or isolate-validate plus exact-recheck an allowed session before applying
it. A disarm can therefore restore a predecessor in other tabs. Pending or
mismatched settled A clears blocked A UI/cache; exact guard-allowed settled S1
is isolate-validated and exact-rechecked before publication.

For sessionless `SIGNED_OUT` while guards exist,
`reconcileGuardedSignedOutEvent` rereads raw storage under the lock. Empty means
signed-out; allowed B/C is then validated through the isolated bearer client.
Valid becomes authoritative, definitive invalid is exact-removed before
signed-out, and transient validation makes no authority change. A blocked
principal remains quarantined; unavailable storage makes no authority change.

After isolated validation, reacquire the storage lock and require the exact
principal/access/refresh snapshot plus allowed session ID and guard revision to
remain current. If B changed to B2/C/signed-out while validation awaited,
discard the stale result and restart from current storage. Finite changes
converge; impose no cap that could republish an older snapshot.

- [ ] **Step 4: Implement principal-specific cache removal**

Add one exact-key predicate; do not infer ownership from arbitrary array
positions outside the documented key families:

```ts
function isQueryOwnedByPrincipal(
  queryKey: readonly unknown[],
  principalId: string,
): boolean {
  const [root, surface, owner] = queryKey;
  return (
    owner === principalId &&
    ((root === 'account' && surface === 'profile') ||
      (root === 'rating' &&
        (surface === 'mine' || surface === 'ratedProducts')))
  );
}

export async function removePrincipalScopedQueries(
  queryClient: QueryClient,
  principalId: string,
): Promise<void> {
  const filters = {
    predicate: (query: Query) =>
      isQueryOwnedByPrincipal(query.queryKey, principalId),
  };
  await queryClient.cancelQueries(filters);
  queryClient.removeQueries(filters);
}
```

Keep `removeUserScopedQueries` unchanged. In
`prepareUserScopedCacheForPrincipal`, use complete root cleanup for
`principal -> null` and `null -> null`, but use principal-specific cleanup for
`A -> B`. Claim B only after A cleanup settles. This preserves existing
ordinary sign-out behavior while retaining pre-existing B cache on switches.
Update only the ownership comment above `USER_SCOPED_KEY_ROOTS` in `keys.ts`:
ordinary full sign-out/invalid-session cleanup uses the roots, while account
switches and superseded deletion use principal-specific matching. Do not alter
any key tuple.

- [ ] **Step 5: Add the provider-local Auth writer fence**

```ts
const authSessionWriteTailRef = useRef<Promise<void>>(Promise.resolve());

const runAuthSessionWrite = useCallback(<T,>(write: () => Promise<T>): Promise<T> => {
  const result = authSessionWriteTailRef.current
    .catch(() => undefined)
    .then(() => write());
  authSessionWriteTailRef.current = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}, []);
```

Route these provider-owned shared-session writers through the fence, without
moving their existing state/cache settlement into the critical section:

```txt
signInWithPassword
signUpWithPassword
adoptRecoverySessionAfterDeletionGuard exact classified-predecessor transaction
reconcileSupersededRecovery exact displaced-A CAS
```

Deletion-winner restoration is intentionally absent: it performs no session
write and reconciles the already-stored raw winner.

Bounded implementation ruling (2026-08-21): keep the
full unabortable `processAuthCallbackUrl` exchange outside this FIFO because
wrapping it reproduced the accepted Task 18 recovery/explicit-auth cross-wait
deadlock. Capture the guarded recovery predecessor under storage before the
exchange. After the SDK callback releases its Auth lock, enter the provider
FIFO and `Auth operation -> storage`. Settled adoption accepts only unchanged
guard plus raw exact S1 or already exact returned S2; lease-expired pending
accepts only its exact classified predecessor or already exact S2. Same-session-
ID S2 is supported. No recovery-owned S2 event may publish before transaction
success. Every non-success outcome stays token-free and cannot claim recovery
success. A `not-guarded` capture keeps Task 18's existing exchange plus exact
post-SDK `adoptExplicitSessionAfterDeletionGuard` path; do not force ordinary
recovery through the guarded-predecessor transaction.

`reconcileSupersededRecovery` isolate-validates B, enters the provider FIFO and
`Auth operation -> storage`, then may replace only the exact, guard-allowed
displaced A principal/access/refresh/session-ID snapshot. Raw C, newer A2,
empty, malformed, blocked, or uncertain authority is preserved; the operation
never retries or emits an SDK Auth event. It emits only the payload-free change
signal after a confirmed or uncertain write, then runs outcome-bearing guarded
reconciliation and one final exact read before publication.

Deletion settlement itself uses the storage transaction, not an SDK session
writer. Bootstrap still settles through `sessionRestoreRef` before deletion
starts. Narrowly replace Task 16's definitive-invalid shared-sign-out cleanup
with `removeStoredSessionIfExact`, and make ordinary sign-in plus verified
recovery callback adoption commit a fresh guarded session when needed; do not
otherwise redesign bootstrap or Task 18 update-password behavior.

Configure the shared client with the Step 3 non-stealing Auth-operation lock.
Deletion completes storage capability preflight, runs guard arm inside one
short `runSupabaseAuthOperation(storageKey, ...)` section, handles the returned
arm result after release, and performs isolated reauthentication without the
shared lock. It then reacquires the Auth-operation lock around the final winner/
revision/raw-storage check, pending transition, one server invocation, guard
transition/disarm, and guarded primary cleanup. Restoration of B/C after
release performs no SDK write: it reconciles raw storage, validates that exact
session in isolation, and exact-rechecks before publication. Ordinary sign-out
and recovery cleanup use the isolated token-pinned/exact-remove boundary, not
shared Auth sign-out.
If ordinary sign-out returns token-free `superseded`, AuthProvider preserves the
replacement principal and skips signed-out publication/broad cache cleanup.
The storage transaction that changes `preparing` to `pending` must still find
raw A with a non-empty `session_id`; stored B/C, guarded B/C, signed-out/empty,
malformed, or unreadable authority prevents the Function call and settles the
attempt as superseded or safely unconfirmed.

- [ ] **Step 6: Add versioned operation state and listener classification**

```ts
const deletionGenerationRef = useRef(0);
const activeDeletionAttemptRef = useRef<ActiveDeletionAttempt | null>(null);
const deletionInFlightRef = useRef(false);
const guardedAuthReconciliationTailRef = useRef<Promise<void>>(Promise.resolve());
```

Reject a second call with `account-deletion-in-progress`. Register the first
with `beginExplicitAuthOperation()` and wait for recovery reconciliation.

The Supabase `onAuthStateChange` callback must not await storage/validation or
reacquire the Auth-operation lock. It captures event/session, appends one work
item to `guardedAuthReconciliationTailRef`, and returns immediately. Use the
same queue for guard signals, mount, and foreground:

```ts
function enqueueGuardedAuthWork(work: () => Promise<void>): void {
  const next = guardedAuthReconciliationTailRef.current
    .catch(() => undefined)
    .then(work);
  guardedAuthReconciliationTailRef.current = next.catch(() => undefined);
}

client.auth.onAuthStateChange((event, session) => {
  enqueueGuardedAuthWork(() => processDeferredAuthEvent(event, session));
});
```

`processDeferredAuthEvent` runs only after the SDK callback returns; it may then
acquire `Auth operation -> storage`, reconcile, and apply ordinary Auth logic in
this order:

```ts
const storageKey = resolveProviderStorageKey(clientProp);
let classifiedEvent = event;
let classifiedSession = session;

if (event === 'SIGNED_OUT') {
  const stored = await reconcileGuardedSignedOutEvent(
    storageKey,
  );
  if (stored.kind === 'allowed-session') {
    classifiedEvent = 'SIGNED_IN';
    classifiedSession = stored.session;
  } else if (stored.kind !== 'empty') {
    return;
  }
}

if (
  classifiedSession != null &&
  (await isSessionBlockedByDeletionGuard(
    storageKey,
    classifiedSession,
  ))
) {
  return;
}

const attempt = activeDeletionAttemptRef.current;
const eventPrincipal = userIdFromSession(classifiedSession);

if (
  attempt != null &&
  classifiedSession != null &&
  eventPrincipal === attempt.principalId
) {
  return;
} else if (
  attempt != null &&
  classifiedSession != null &&
  eventPrincipal != null &&
  eventPrincipal !== attempt.principalId
) {
  attempt.winnerVersion += 1;
  attempt.winner = {
    kind: 'session',
    version: attempt.winnerVersion,
    principalId: eventPrincipal,
    session: classifiedSession,
  };
} else if (attempt != null && classifiedEvent === 'SIGNED_OUT') {
  attempt.winnerVersion += 1;
  attempt.winner = { kind: 'signed-out', version: attempt.winnerVersion };
}
```

Other A events are maintenance for the account already subject to global
revocation/deletion; they never replace a recorded non-A winner. There is no
A-settlement `SIGNED_OUT` marker because principal-bound storage removal emits
no SDK event. Feed `classifiedEvent`/`classifiedSession`—not the original
sessionless event—into the ordinary listener path after classification.

While a recovery generation is active, record recovery-owned S2 events as
maintenance only. Do not update `latestAuthPrincipalRef`, React user/status,
cache ownership, or recovery success from that event. Exact adoption and its
post-write reconciliation own publication. Use this same resolved `storageKey`
for recovery predecessor capture/adoption, guard signals, mount/foreground, and
forced reconciliation; never re-derive from ambient environment.

For `GuardReconciliationRequest.kind === 'forced-recovery'`, an `exact`
displacement may call exact removal only after current principal/access/
refresh/session-ID/guard revision matches that displacement. An `unknown`
displacement never calls primary/companion removal or purges the same-principal
cache. It reconciles current raw authority: allowed S1 is isolate-validated and
exact-rechecked before publication; blocked/unavailable remains quarantined;
A2/C/empty/malformed authority is preserved according to its current
classification.

Add one provider effect that subscribes to the payload-free guard channel,
runs reconciliation on mount, and reruns when AppState/visibility returns to
foreground by enqueueing on the same tail. Generation-check every completion.
For ordinary reconciliation, blocked/empty clears only the displayed
principal's cache/recovery/UI; allowed exact session uses isolated validation
plus post-await storage/guard recheck. Forced recovery follows the exact/
unknown displacement rule below and never inherits ordinary cleanup authority.

Exempt only the initiating provider whose active attempt principal and exact
`guardRevision` match the current `preparing`/`pending` record; it retains A's
pending UI until its result. Every other provider/revision clears blocked A.
Deliver native process notifications asynchronously after the transaction
caller records its returned revision; foreground uses the same exemption. Add
unsubscribe/unmount invalidation so late queued work cannot mutate React state.

- [ ] **Step 7: Implement A capture, coordination preflight, and pinned invocation**

Require `status === 'signed-in'`, `user.id === latestAuthPrincipalRef.current`,
and a non-empty `user.email`. Before password reauthentication, await
`preflightPrincipalBoundAuthStorage(storageKey, A)`; `guard-busy` uses fixed
`account-deletion-in-progress`, while lock-request rejection uses fixed
`account-deletion-failed`. Neither performs an Auth or Functions call.

Capture A/generation, then run the arm as:

```ts
const arm = await runSupabaseAuthOperation(storageKey, () =>
  armPrincipalDeletionGuard(storageKey, A),
);
```

The callback only returns the arm result; store its revision and handle
preserved/quarantine outcomes after the short Auth-operation section releases.
Only `armed` permits isolated reauthentication, which runs without the shared
lock. The isolated reauthentication accepts `expectedPrincipalId: A`, emits no
shared Auth event/write, and returns only the token-free user plus operation-
local bearer.

If a winner appears during isolated reauthentication, do not invoke; reacquire
the Auth-operation lock to disarm/preserve quarantine by exact revision, then
reconcile after release and return `superseded`. Otherwise reacquire it for the
final revision/winner check, pending transition, server call, and settlement.

For guard arm, `preserved-winner` is installed/reconciled after release;
`preserved-guarded` publishes no principal; `guard-busy` returns
`account-deletion-in-progress`; `unavailable` rejects as a fixed
pre-revocation failure; and `quarantine-unconfirmed` publishes the signed-out
shell without a deletion claim. Only `armed` stores its `guardRevision` on the
attempt and permits isolated reauthentication followed by `deleteCurrentUser`
with the exact returned bearer. After reauthentication/final winner check,
`markPrincipalDeletionDispatched(storageKey, A, guardRevision)` must return and
read back `pending` before invocation; stale/unconfirmed performs no server
call. Never ask shared `getSession()` to choose the bearer.

- [ ] **Step 8: Implement newest-winner reconciliation and A settlement**

```ts
async function restoreDeletionWinner(
  client: AppSupabaseClient,
  attempt: ActiveDeletionAttempt,
): Promise<'session' | 'signed-out' | 'restore-failed'>;

async function settleDeletedPrincipalLocally(
  client: AppSupabaseClient,
  attempt: ActiveDeletionAttempt,
  storageKey: string,
): Promise<'signed-out' | 'superseded' | 'cleanup-unconfirmed'>;
```

`restoreDeletionWinner` loops over the latest observed version:

1. A `signed-out` winner publishes signed-out without `setSession`/`signOut`.
2. A session winner acquires `Auth operation -> storage` and reads raw guarded
   authority without writing. If raw is C/B2/empty/blocked, it replaces the
   captured winner and loops from that state.
3. Only an exact allowed raw B1 is isolate-validated. Publication reacquires
   `Auth operation -> storage` and requires the unchanged winner version plus
   exact B1 principal/access/refresh/session-ID/guard revision. No SDK Auth
   event or synthetic restoration write exists.
4. Finite external transitions converge on one stable pass; impose no cap that
   could publish an obsolete session. This loop never repeats the destructive
   request.

For A settlement:

1. recheck the winner; when one exists, remove only A's Query keys and
   reconcile it without any storage removal;
2. after a destructive/ambiguous server result, transition the pending guard to
   `settled` with the exact `guardRevision`, then call
   `settleGuardedPrincipalSession(storageKey, A, guardRevision)`;
3. `removed-a`/`already-empty` clear recovery, advance authority, remove A's
   keys, and publish signed-out without `auth.signOut`; record companion cleanup
   independently;
4. `preserved-winner` increments `winnerVersion`, installs the returned exact
   session as the newest winner, then runs the same final exact guard/storage
   publication check. Changed/newly guarded B restarts reconciliation; only an
   allowed exact snapshot is published before returning `superseded`; and
5. `preserved-guarded` preserves the raw non-A bytes but publishes no principal,
   removes only A's keys, and returns `superseded` with the quarantined shell;
6. `stale-attempt` performs no guard/session mutation and yields to the newer
   attempt; and
7. `quarantined-unavailable` never falls back to shared sign-out. The pending or
   settled guard continues hiding A reads, rejecting stale A writes, and
   suppressing A events. Clear only in-memory A, recovery state, and A's Query
   keys; publish the signed-out shell and record physical cleanup unconfirmed.

Retain each restoration marker in a local constant and clear it in `finally`
only when the ref still points to that object. A nonmatching event must fall
through. The cross-context guarantee applies to participating current-version
app contexts using the reviewed adapter; do not claim a CAS against direct or
older-version storage writers.

For a fixed pre-revocation server error after guard arm, call
`disarmPrincipalDeletionGuard(storageKey, A, guardRevision)`. Disarm only when
unchanged A still owns storage and no winner exists; restore the predecessor
record with a newly advanced revision or remove the record only when there was
no predecessor. Stored B remains authoritative only when its own guard allows
it. Stale/unconfirmed disarm remains a safe quarantine and never retries the
server. Clear the initiating attempt exemption before enqueueing mandatory
guard reconciliation, so A cannot remain visually signed in. Every
destructive/ambiguous outcome settles A locally, returning its original kind
only if A still owns local state; otherwise return `superseded`.

If an earlier refresh held the Auth lock with raw A1, arm must wait until that
refresh persists exact A2. A confirmed pre-revocation failure then disarms only
the exact guard revision: raw/readable storage remains exact A2, signed-in A and
A's principal cache remain, no destructive request runs, and no shared sign-out
is called. Any later A3 write/event reaching storage after arm stays
quarantined.

- [ ] **Step 9: Publish the context method and safely finalize**

Add `deleteAccount` to `AuthContextValue`, `useMemo`, and dependencies. In
`finally`, clear the attempt/duplicate guard only for the matching deletion
generation, then settle the explicit auth-operation promise. Any stale/
unconfirmed pending transition/disarm queues one post-finalization reconciliation
after that clear; do not rely on self-delivered guard notification.

- [ ] **Step 10: Remove diagnostic labels and run auth/storage/cache regressions**

After the new configured-environment/injected-client regression proves the
corrected path, remove every temporary `[AuthRecoveryStage]` label added by
diagnostic head `b843dc8`. Add no replacement session-bearing diagnostic.

```bash
! rg -n 'AuthRecoveryStage' src/features/auth/AuthProvider.tsx
npm test -- --runInBand \
  src/lib/supabase/authCoordination.test.ts \
  src/lib/supabase/authStorage.test.ts \
  src/lib/supabase/client.test.ts \
  src/features/auth/api.test.ts \
  src/features/auth/recovery.api.test.ts \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/AuthProvider.deletion.test.tsx \
  src/features/auth/AuthProvider.test.tsx \
  src/lib/query/userScopedCache.test.ts \
  src/lib/query/query.infrastructure.test.tsx
npm run typecheck
npm run lint
```

Expected: PASS, including Task 16–18 recovery, injected-key precedence under
configured public environment, guard-arm-after-refresh A2 rollback, settled and
expired-pending exact predecessor adoption, same-session-ID/raw-exact-S2,
unknown-displacement no-cleanup/cache preservation, maintenance-only S2 events,
ordinary sign-out, guarded offline bootstrap, exact invalid-session cleanup,
A->B cache isolation, B-before-event preservation, B->signed-out, B->C, and
zero shared-sign-out calls during deletion settlement, ordinary local sign-out,
recovery cleanup, or definitive-invalid bootstrap cleanup.

- [ ] **Step 11: Commit checkpoint, only when authorized**

```bash
git add src/features/auth/AuthProvider.tsx \
  src/features/auth/AuthProvider.deletion.test.tsx \
  src/features/auth/AuthProvider.test.tsx \
  src/features/auth/api.ts src/features/auth/api.test.ts \
  src/features/auth/recovery.api.test.ts \
  src/features/auth/deletion.api.ts src/features/auth/deletion.api.test.ts \
  src/lib/supabase/authCoordination.ts \
  src/lib/supabase/authCoordination.test.ts \
  src/lib/supabase/authStorage.ts src/lib/supabase/authStorage.test.ts \
  src/lib/supabase/createClient.ts src/lib/supabase/client.ts \
  src/lib/supabase/client.test.ts \
  src/lib/query/keys.ts src/lib/query/userScopedCache.ts \
  src/lib/query/userScopedCache.test.ts
git commit -m "feat: protect account deletion auth settlement"
```

### Task 4: Add the Shared Destructive Button Variant

**Files:**

- Create: `src/components/ui/Button.test.tsx`
- Modify: `src/components/ui/Button.tsx`

**Interfaces:**

- Consumes: existing NativeWind `negative: '#b91c1c'` token.
- Produces:

```ts
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
```

- [ ] **Step 1: Write failing Button tests**

Assert `bg-negative`, white label/spinner, accessible role/name, disabled and
loading press suppression, and unchanged primary/secondary/ghost classes. Use
a test-only `as never` variant cast so the current component renders and the
class assertion—not TypeScript—provides RED.

- [ ] **Step 2: Run the test and confirm the intended failure**

```bash
npm test -- --runInBand src/components/ui/Button.test.tsx
```

Expected: FAIL in the `bg-negative` assertion because the rendered button lacks
the destructive classes. Import/type/syntax failures are setup errors.

- [ ] **Step 3: Implement the bounded variant**

```ts
destructive: 'bg-negative';
destructive: 'text-white';
```

```tsx
<ActivityIndicator
  color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : '#0066cc'}
/>
```

Do not change height, radius, scale, disabled opacity, or existing variants.

- [ ] **Step 4: Run test, typecheck, and lint**

```bash
npm test -- --runInBand src/components/ui/Button.test.tsx
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit checkpoint, only when authorized**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat: add destructive button variant"
```

### Task 5: Build the Inline Account Deletion Experience

**Files:**

- Modify: `app/(tabs)/account.tsx`
- Modify: `src/features/account/AccountScreen.test.tsx`

**Interfaces:**

- Consumes:

```ts
deleteAccount(password: string): Promise<DeleteAccountOutcome>;
```

- Produces stable test IDs:

```txt
account-delete-open
account-delete-confirmation
account-delete-copy
account-delete-password
account-delete-error
account-delete-cancel
account-delete-submit
account-delete-outcome
```

- Produces no route and makes no router call for deletion.

- [ ] **Step 1: Extend the Account mock and write failing UI tests**

Add `mockDeleteAccount` to `MockAuthState` and reset it in `beforeEach`. Cover:

```ts
const accountCases = [
  'hides Delete Account signed out and shows it signed in',
  'keeps Delete Account separate from Sign out',
  'opens inline confirmation with exact permanence and aggregate copy',
  'uses a secure accessible Current password field',
  'disables empty submit and passes nonempty bytes unchanged',
  'cancel closes and clears password and error',
  'pending disables input cancel sign-out entry and final action and invokes once',
  'pre-revocation failure keeps A signed in with fixed safe copy',
  'deleted shows success copy on signed-out Account',
  'retained account shows signed-out sign-in-to-retry copy',
  'unconfirmed shows honest signed-out ambiguous copy',
  'superseded A leaves B visible with no A form password or notice',
  'opening canceling and submitting deletion make no Expo Router call',
] as const;
```

- [ ] **Step 2: Run Account tests and confirm the intended failure**

```bash
npm test -- --runInBand src/features/account/AccountScreen.test.tsx
```

Expected: FAIL in the signed-in Delete Account query because the action is not
rendered. The extended context mock must already be compile-complete; type or
mock-shape failures are setup errors.

- [ ] **Step 3: Add form/outcome state and principal-change cleanup**

Extend the React import with `useEffect`/`useRef`; import `Input`, `AuthError`,
and the deletion outcome type from their existing modules.

```ts
type DeletionNotice =
  | 'deleted'
  | 'not-deleted-signed-out'
  | 'unconfirmed-signed-out';

const [deleteOpen, setDeleteOpen] = useState(false);
const [currentPassword, setCurrentPassword] = useState('');
const [deletePending, setDeletePending] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);
const [deletionNotice, setDeletionNotice] = useState<DeletionNotice | null>(null);
const priorPrincipalRef = useRef<string | null>(user?.id ?? null);
```

An effect keyed by `user?.id` clears form/password/error whenever principal
changes. Preserve a notice only for A→signed-out; clear it for a new signed-in B.

```ts
useEffect(() => {
  const nextPrincipal = user?.id ?? null;
  if (priorPrincipalRef.current === nextPrincipal) return;
  priorPrincipalRef.current = nextPrincipal;
  setDeleteOpen(false);
  setCurrentPassword('');
  setDeleteError(null);
  if (nextPrincipal != null) setDeletionNotice(null);
}, [user?.id]);
```

- [ ] **Step 4: Render outcome copy on signed-out Account**

```ts
const deletionMessages: Record<DeletionNotice, string> = {
  deleted:
    'Your account was deleted. You can continue browsing Eazy Review without an account.',
  'not-deleted-signed-out':
    'Your account was not deleted. All sessions were signed out. Sign in again to retry.',
  'unconfirmed-signed-out':
    "We couldn't confirm whether account deletion finished. Sign in again. If your account is still available, you can retry deletion.",
};
```

Render with `account-delete-outcome` and `accessibilityRole="alert"` before the
existing Sign in/Create account card. Keep anonymous browsing available.

- [ ] **Step 5: Render inline confirmation after the separate Sign out card**

Use exact copy:

```txt
Your Eazy Review account, your My Rating entries, and private notes will be permanently deleted. Public product information will remain. Each affected Community Score will be recalculated without your rating. This cannot be undone.
```

Configure Input:

```tsx
<Input
  testID="account-delete-password"
  value={currentPassword}
  onChangeText={setCurrentPassword}
  secureTextEntry
  autoCapitalize="none"
  autoCorrect={false}
  autoComplete="password"
  textContentType="password"
  accessibilityLabel="Current password"
  editable={!deletePending}
  invalid={deleteError != null}
  errorMessage={deleteError ?? undefined}
/>
```

Use `destructive` only for `Delete my account`, secondary for Cancel, and an
alert role for error copy. Pending disables input, Cancel, Sign out, entry, and
final action. Empty means `currentPassword.length === 0`; never trim.
Set `accessibilityLabel="Delete my account"` on the final button so its name
remains available while the visible label is replaced by a loading spinner.

- [ ] **Step 6: Implement submit/cancel and safe outcome handling**

```ts
const onDeleteAccount = async () => {
  if (deletePending || currentPassword.length === 0) return;
  setDeletePending(true);
  setDeleteError(null);
  try {
    const outcome = await deleteAccount(currentPassword);
    setCurrentPassword('');
    setDeleteOpen(false);
    if (outcome.kind !== 'superseded') setDeletionNotice(outcome.kind);
  } catch (error) {
    setDeleteError(
      error instanceof AuthError
        ? error.message
        : AUTH_USER_MESSAGES.accountDeletionFailed,
    );
  } finally {
    setDeletePending(false);
  }
};
```

Cancel clears password/error. Superseded sets no notice. Never surface cause.

- [ ] **Step 7: Run UI/provider integration checks**

```bash
npm test -- --runInBand \
  src/features/account/AccountScreen.test.tsx \
  src/components/ui/Button.test.tsx \
  src/features/auth/AuthProvider.deletion.test.tsx
npm run typecheck
npm run lint
```

Expected: PASS; signed-out browsing remains and deletion triggers no route.

- [ ] **Step 8: Commit checkpoint, only when authorized**

```bash
git add app/'(tabs)'/account.tsx src/features/account/AccountScreen.test.tsx
git commit -m "feat: add inline account deletion confirmation"
```

### Task 6: Prove Existing Cascade Metadata Without Deleting an Account

**Files:**

- Modify: `supabase/tests/database/schema.test.sql:6,43-81`

**Interfaces:**

- Consumes: accepted Task 11 FKs and PostgreSQL catalogs.
- Produces: two pgTAP assertions, no migration/Auth-row mutation.

- [ ] **Step 1: Add exact catalog assertions**

Change `plan(37)` to `plan(39)`. For each child, join `pg_constraint`, child/
parent classes/namespaces, and attributes through `conkey`/`confkey`. Require
exactly one FK with:

```sql
c.contype = 'f'
and parent_namespace.nspname = 'auth'
and parent_table.relname = 'users'
and parent_attribute.attname = 'id'
and c.confdeltype = 'c'
```

Targets:

```txt
public.profiles.id -> auth.users.id
public.user_ratings.user_id -> auth.users.id
```

Use `is(count(*)::int, 1, ...)`, not loose definition text.

- [ ] **Step 2: Run the narrow pgTAP proof on a trusted local stack**

```bash
DO_NOT_TRACK=1 supabase test db --local supabase/tests/database/schema.test.sql
```

Expected: PASS with 39 assertions. If this CLI lacks a file argument, use
`npm run test:db:pgtap` and report the broader result.

- [ ] **Step 3: Run the clean DB gate only with local-reset authorization**

```bash
npm run test:db:reset
```

Expected: all pgTAP and rating-concurrency tests pass. This is not Auth-account
deletion proof.

- [ ] **Step 4: Confirm no schema artifact changed**

```bash
git diff --name-only -- supabase/migrations src/types/database.generated.ts
```

Expected: no output.

- [ ] **Step 5: Commit checkpoint, only when authorized**

```bash
git add supabase/tests/database/schema.test.sql
git commit -m "test: prove account deletion cascade metadata"
```

### Task 7: Synchronize Contracts, Status, and Evidence

**Files:**

- Modify: `README.md:22-100`
- Modify: `AGENTS.md:61-86`
- Modify: `docs/AGENT_WORKFLOW.md:302-345`
- Modify: `docs/TASKS.md:830-845,887-944` and Task 19 revised-sequence row
- Modify: `docs/ROADMAP.md:35-80`
- Modify: `docs/API_CONTRACTS.md:255-281,365-559,627-644`
- Modify: `docs/USER_FLOWS.md:231-246,288-310`
- Modify: `docs/DESIGN.md:493-520`
- Modify: `docs/DATA_MODEL.md:308-330`
- Modify: `docs/RELEASE_CHECKLIST.md:73-91`
- Modify: `docs/SECURITY.md:63-75,148-188`
- Modify: `.cursor/rules/security.mdc` as the required security mirror
- Modify:
  `docs/decisions/2026-07-26-caller-derived-session-aware-self-deletion.md`
- Regenerate: `docs/DECISIONS.md`
- Create: `docs/evidence/task-19-protected-account-deletion/RESULT.md`
- Create: `docs/evidence/task-19-protected-account-deletion/VERIFICATION.md`
- Modify status only when the corresponding gate occurs:
  `docs/superpowers/specs/2026-08-19-task-19-protected-account-deletion-design.md`
- Preserve: `docs/superpowers/plans/2026-08-19-task-19-protected-account-deletion.md`
- Review without editing unless semantics changed: `docs/MCP_WORKFLOW.md` and
  every other path returned by the impact report.

**Interfaces:**

- Consumes: final verified behavior and real command results.
- Produces: implementation-complete but destructive-acceptance-pending truth.

- [ ] **Step 1: Update API contract and accepted ADR**

Replace deferred deletion with the public outcome union, fixed current-password
reauthentication, pinned bearer, zero semantic body, fixed code map, AMR rule,
`validation-unavailable`, gateway-401 exception, and no retry.

Add `deletion.api.ts` plus the principal-bound Auth-storage helper to the Auth
structure map. Replace the locked broad account-switch cleanup clause: ordinary
full sign-out/known-invalid-session paths retain complete user-root removal,
while A-to-B switching and superseded deletion remove only the displaced
principal's documented account/rating keys. Use `Delete Account` consistently
for the in-app action label.

Document sign-in, verified-recovery, deletion-reauthentication, Functions, and
bootstrap contracts for isolated reauthentication/validation/sign-out/invocation,
the shared non-stealing Auth-operation lock, revision-bound
preparing/pending/settled guards,
guard-aware B publication, and exact-session cleanup. The positive guard shape
is store version/counter plus principal-keyed revision/state/lease, Auth subject
ID, optional explicitly adopted Auth session ID, and pending predecessor state. It contains
no access/refresh token, email, password, profile, rating, note, or provider
response. Do not describe it as server retention or claim physical storage
cleanup when only quarantine is proved.

Document storage-key precedence (`storageKey` -> injected client -> singleton
environment), the short Auth-lock-before-arm section, settled-allowed and
expired-pending recovery predecessor classifications, raw-exact-S1/already-
exact-S2 success, same-session-ID S2, maintenance-only recovery events, and the
prohibition on unknown-snapshot session/companion/cache cleanup. Record that
predecessor snapshots remain operation-local and absent from guard metadata,
context, logs, and evidence.

Document the payload-free web/native guard-change signal and mount/foreground
reconciliation. The channel contains only fixed version/change labels; no
principal, session, token, or outcome. Record the deferred Auth-event tail,
exact owner-revision pending exemption, final publication recheck, and mandatory
post-finalization reconciliation after stale/unconfirmed guard transitions.

Amend the accepted ADR rather than creating another. Update its `updated` date
and state: cleanup after deletion/revocation/ambiguity does not claim deletion;
one lookup follows uncertain delete; B stays safe; response loss is ambiguous.

- [ ] **Step 2: Update flow/design/data/release documents**

Record the inline card, exact copy, destructive variant, secure field, pending/
alert behavior, three outcomes, and no route in DESIGN/USER_FLOWS. Record the
two catalog-only FK assertions and no migration in DATA_MODEL. Require honest
partial/ambiguous handling and no destructive retry in RELEASE_CHECKLIST.
Update SECURITY and its mirror with guard data minimization, guarded offline
bootstrap, exact-session invalid cleanup, and the no-shared-sign-out rule.
Include no-transient-S2 publication and exact-displacement-only cleanup as Auth
authority invariants.
Update Task 18/Flow 5 mechanism text from automatic shared `SIGNED_OUT` cleanup
to isolated exact-bearer validation/revoke plus exact-session removal. Preserve
Task 18's accepted status and evidence; this does not reopen its product gate.

- [ ] **Step 3: Document validation ownership**

Add `npm run check:functions` to README, AGENTS, and AGENT_WORKFLOW Validation
Commands. Database CI owns Deno; `check:readonly`/Expo CI remain Node/Expo-only.

- [ ] **Step 4: Create an honest evidence report**

Separate rows for:

```txt
Mocked Edge Function tests
Principal-bound Auth-storage race tests
Preparing/pending/settled guard, offline bootstrap, and late Auth proof
Injected-client key precedence under configured public environment
Settled S1-to-S2 and same-session-ID/raw-exact-S2 recovery proof
Lease-expired-pending exact predecessor proof
Unknown-displacement no-session/no-cache-cleanup proof
Recovery-owned S2 no-transient-publication proof
Two-context guard notification, cache isolation, and foreground reconciliation
Client/provider/UI Jest
Read-only FK metadata proof
Local check:readonly and check:expo
Exact-head Expo CI and Database CI
Web preview, iOS Simulator, physical device
Staging function deployment/configuration
Human staging deletion
Second-session refresh rejection
Residual JWT-expiry observation
Human acceptance
Production
```

Populate only observed results. Before human staging use `not-run`; physical
uses `not-tested`. Include `git rev-parse HEAD`, environment, command, result,
and the statement that agents never submitted deletion and production stayed
untouched. No identity/secret evidence.

- [ ] **Step 5: Update lifecycle status only after implementation gates**

Use exactly:

```txt
Partial — implementation complete; human staging deletion pending.
```

Use the same state in TASKS, ROADMAP, and README and link the evidence. Do not
mark Done, accepted, deployed, ready, or merged.

Update the design-spec status only with the gate that actually occurred: plan
approval may be recorded after human review; implementation authorization and
implementation completion remain separate statements with their actual dates.

- [ ] **Step 6: Regenerate and validate docs infrastructure**

```bash
npm run decisions:build
npm run decisions:check
node scripts/check-agent-infrastructure.cjs --report \
  package.json tsconfig.json eslint.config.js \
  .github/workflows/database-ci.yml supabase/config.toml \
  supabase/functions/delete-current-user/contracts.ts \
  supabase/functions/delete-current-user/handler.ts \
  supabase/functions/delete-current-user/handler_test.ts \
  supabase/functions/delete-current-user/supabaseAuthAdminAdapter.ts \
  supabase/functions/delete-current-user/supabaseAuthAdminAdapter_test.ts \
  supabase/functions/delete-current-user/index.ts \
  supabase/functions/delete-current-user/deno.json \
  supabase/functions/delete-current-user/deno.lock \
  src/features/auth/types.ts src/features/auth/errors.ts \
  src/features/auth/errors.test.ts \
  src/features/auth/api.ts src/features/auth/deletion.api.ts \
  src/features/auth/AuthProvider.tsx \
  src/features/auth/api.test.ts src/features/auth/recovery.api.test.ts \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/AuthProvider.deletion.test.tsx \
  src/features/auth/AuthProvider.test.tsx \
  src/lib/supabase/authCoordination.ts \
  src/lib/supabase/authCoordination.test.ts \
  src/lib/supabase/authStorage.ts src/lib/supabase/createClient.ts \
  src/lib/supabase/client.ts src/lib/supabase/authStorage.test.ts \
  src/lib/supabase/client.test.ts \
  src/lib/query/keys.ts src/lib/query/userScopedCache.ts \
  src/lib/query/userScopedCache.test.ts \
  app/'(tabs)'/account.tsx src/features/account/AccountScreen.test.tsx \
  src/components/ui/Button.tsx src/components/ui/Button.test.tsx \
  supabase/tests/database/schema.test.sql
npm run check:agent-infra
```

Review every reported path. Modify only affected sources and list reviewed-no-
change paths in the handoff.

- [ ] **Step 7: Commit checkpoint, only when authorized**

```bash
git add AGENTS.md README.md .cursor/rules/security.mdc \
  docs/AGENT_WORKFLOW.md docs/API_CONTRACTS.md \
  docs/DATA_MODEL.md docs/DECISIONS.md docs/DESIGN.md \
  docs/RELEASE_CHECKLIST.md docs/ROADMAP.md docs/SECURITY.md docs/TASKS.md \
  docs/USER_FLOWS.md \
  docs/decisions/2026-07-26-caller-derived-session-aware-self-deletion.md \
  docs/evidence/task-19-protected-account-deletion/RESULT.md \
  docs/evidence/task-19-protected-account-deletion/VERIFICATION.md \
  docs/superpowers/specs/2026-08-19-task-19-protected-account-deletion-design.md \
  docs/superpowers/plans/2026-08-19-task-19-protected-account-deletion.md
git commit -m "docs: record Task 19 implementation state"
```

### Task 8: Run Integrated Non-Destructive Handoff Gates

**Files:**

- Update with real results:
  `docs/evidence/task-19-protected-account-deletion/RESULT.md`
- Update with command and checklist detail:
  `docs/evidence/task-19-protected-account-deletion/VERIFICATION.md`
- Update ignored session state: `docs/notes/handoff.md`

**Interfaces:**

- Consumes: Tasks 1–7 on one exact state.
- Produces: reviewed local evidence and a human checklist; no deletion,
  deployment, push, readiness transition, or merge.

- [ ] **Step 1: Run the narrow complete automated matrix**

```bash
npm run check:functions
npm test -- --runInBand \
  src/lib/supabase/authCoordination.test.ts \
  src/lib/supabase/authStorage.test.ts \
  src/lib/supabase/client.test.ts \
  src/features/auth/api.test.ts \
  src/features/auth/recovery.api.test.ts \
  src/features/auth/deletion.api.test.ts \
  src/features/auth/AuthProvider.deletion.test.tsx \
  src/features/auth/AuthProvider.test.tsx \
  src/features/account/AccountScreen.test.tsx \
  src/components/ui/Button.test.tsx \
  src/lib/query/userScopedCache.test.ts
npm run typecheck
npm run lint
npm run check:secrets
npm run check:readonly
git diff --check
```

Expected: PASS. Classify failures caused/pre-existing/environment-blocked.
Use `skills/test-and-validation-loop`; stop after two repair attempts.

- [ ] **Step 2: Run DB validation under its explicit local gate**

If local reset is authorized:

```bash
npm run test:db:reset
npm run types:check
```

Otherwise record not-run/blocked and await exact-head Database CI after a
separately authorized push.

- [ ] **Step 3: Verify the local gateway boundary without a user bearer**

With the trusted local Supabase stack running, serve the function without
printing generated credentials, then issue only:

```bash
curl -i -X OPTIONS \
  http://127.0.0.1:54321/functions/v1/delete-current-user
curl -i -X POST \
  http://127.0.0.1:54321/functions/v1/delete-current-user
```

Expected: unauthenticated OPTIONS succeeds with CORS; POST is rejected by the
gateway with HTTP 401 before the handler. Do not obtain/pass a user JWT and do
not exercise revocation or deletion. If local serving is unavailable, record
this smoke blocked; unit tests do not prove gateway preflight behavior.

- [ ] **Step 4: Run the parent Expo gate after trusted-base review**

```bash
npm run check:expo
```

Expected: route preparation has no unintended drift; Jest, Expo Doctor, and
dependency alignment pass. This parent-owned gate runs `prepare:routes` and may
rewrite `tsconfig.json`; inspect that tracked path immediately afterward and
revert nothing automatically. Otherwise record unavailable substeps honestly.

- [ ] **Step 5: Conduct non-destructive interactive review only**

Use `skills/interactive-preview-loop` on mobile web and iOS Simulator. Reuse an
already authenticated disposable non-production session, or hand credential
entry to the human without exposing it to the agent. Open the confirmation,
inspect copy/secure field/keyboard/Cancel/layout, cancel, and verify the field
clears. Stop before submitting `Delete my account` with any non-empty password.
Any screenshot must be identity-free and focused on the confirmation card.

- [ ] **Step 6: Prepare but do not execute the human staging matrix**

The human account has multiple ratings, a private note, a shared product, a
last-rater product, and a second pre-existing session. Checklist rows:

```txt
profile/rating/private-note cascade
shared-product Community Score recomputation
last-rater count 0 and null averages/score
local auth/user-cache cleanup and public browsing
offline relaunch does not restore guarded deleted principal
deleted-credential sign-in rejection
second-session refresh rejection
access-token behavior through exp
hosted JWT expiry no greater than 3600 seconds
```

Leave all rows unexecuted. Deployment/configuration/deletion each need a
separate authorization after exact-head review.

- [ ] **Step 7: Request independent review and final verification**

Dispatch one read-only reviewer for spec/plan compliance, authority, secret
isolation, no-retry behavior, the principal-bound storage transaction,
B-before-event/B-between-compare-remove races, refresh-after-final-read,
pending-restart/offline bootstrap, injection-first storage identity,
Auth-lock-before-arm/A2 rollback, settled and expired-pending exact recovery
predecessors, same-session-ID/raw-exact-S2 adoption, unknown-displacement no-
cleanup, maintenance-only S2 publication, A/B/signed-out/C arbitration, and
deletion-first simplification;
one read-only verifier for final commands; and a security review before any
deployment request. Remediate only validated findings in a stated scope.

- [ ] **Step 8: Write the session handoff and stop**

Record branch/SHA, dirty paths, actual checks, reviewed-no-change docs, and
remaining exact-head CI/deployment/human-deletion gates in
`docs/notes/handoff.md`. Do not commit/push/deploy or mark accepted. Recommend
a fresh session for the next authorized gate.

## Spec Coverage Index

| Revised spec area | Owning plan work |
| --- | --- |
| Goals/non-goals and lifecycle authority | Global Constraints, Preconditions, Stop Conditions |
| Password reauthentication and bearer binding | Tasks 2–3 |
| Versioned latest-winner arbitration and Auth writer fence | Task 3 |
| Shared Auth-operation lock, revision-bound guard, late write/removal blocking, isolated exact Auth APIs, and bootstrap quarantine | Tasks 2–3 |
| Explicit/injected/singleton Auth storage-key precedence | Task 3 Steps 1, 3, 6; Task 7 |
| Auth-lock-before-arm sequencing and A2-preserving rollback | Task 3 Steps 1, 3, 5, 7–8; Task 7 |
| Settled and expired-pending exact recovery predecessors, same-session-ID S2, and raw S1/exact-S2 adoption | Task 3 Steps 1, 3, 5–6; Task 7 |
| Unknown-displacement no-cleanup/cache preservation and maintenance-only S2 events | Task 3 Steps 1, 4, 6; Task 7 |
| Principal-specific A cleanup and newer-principal cache preservation | Task 3 |
| Public provider outcome and local settlement | Tasks 2–3 |
| Inline Account UX and exact copy | Tasks 4–5 |
| Edge endpoint, validation, AMR, and non-atomic outcomes | Task 1 |
| Safe errors/logging and no automatic retry | Tasks 1–3 and 5 |
| FK cascade/aggregate and residual-token truth | Tasks 6–8 |
| Mocked automated verification and Deno ownership | Tasks 1–6 and 8 |
| Human-only staging matrix | Task 8 |
| Canonical docs, ADR, evidence, and truthful status | Task 7 |

Fresh-eye review must confirm no revised-spec requirement lacks an owning task.

## Stop Conditions During Execution

Stop for a separate decision if:

- a migration, RLS/grant, aggregate trigger, route, or app runtime dependency
  becomes necessary;
- exact bearer pinning or fixed safe error classification cannot be proven;
- the Edge runtime no longer provides the built-in legacy service-role value
  required by pinned Supabase JS 2.112.0; select and review a current secret-key
  adapter instead of silently adding a dependency or changing headers;
- hosted `verify_jwt = true` rejects a fresh staging user JWT;
- CORS requires weakening authenticated POST handling;
- non-atomic outcomes cannot use the fixed model;
- B cannot be restored without risking B's session/cache;
- a supported platform cannot coordinate all participating Auth-storage writes,
  or stored A cannot be removed without risking a stored non-A session;
- pinned Auth JS cannot use the same non-stealing Auth-operation lock, guarded
  adapter removal cannot deny stale SDK primary deletion, or sessionless events
  cannot reconcile exact stored authority;
- participating contexts cannot receive payload-free guard changes or reconcile
  missed changes on mount/foreground without exposing identity/session data;
- Auth API/provider cannot preserve `storageKey -> injected client -> singleton
  environment` precedence;
- guard arm cannot drain earlier Auth work under `Auth operation -> storage`
  without holding storage while waiting or reconciling inside the held Auth
  lock;
- guarded recovery cannot capture an exact settled or lease-expired-pending
  predecessor before exchange, accept same-session-ID S2 from raw exact S1/
  already-exact S2, or preserve every nonmatching A2/C/empty/malformed/blocked
  authority;
- recovery-owned S2 cannot remain unpublished until exact adoption succeeds;
- forced recovery reconciliation cannot forbid session, companion, and same-
  principal cache cleanup when the displaced snapshot is unknown;
- the exact predecessor cannot remain operation-local and absent from
  persisted/public/logged state;
- finite external Auth transitions cannot converge on the latest observed
  winner without publishing an older snapshot;
- hosted JWT expiry exceeds 3,600 seconds;
- a secret would enter Expo/source/tests/evidence; or
- anyone asks an agent/tool to submit account deletion by browser, MCP, SQL,
  Auth Admin, or API.

## Human-Readable Handoff Shape

1. **What changed** — exact server/client/provider/UI/test/doc files.
2. **Why it matters** — caller-derived deletion, refresh-session revocation,
   honest outcomes, and B isolation.
3. **What is safe** — no secret in Expo, no target ID, no agent deletion,
   production untouched.
4. **What needs review** — protected boundary, copy, exact-head CI, deployment
   identity, staging expiry, human destructive matrix.
5. **Validation** — exact results with not-run/blocked labels preserved.
