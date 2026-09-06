# Security Policy

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/tyson-hu/Eazy-Review/security/advisories/new)
for suspected vulnerabilities. Do not open a public issue or publish an exploit
before coordinated disclosure. If the form is unavailable, email
`me@tianzhe.me` with a brief description and a way to contact you privately.

Include the affected commit or dependency version, the affected behavior,
sanitized reproduction steps and the potential impact. Never include live
credentials, complete recovery URLs, environment files or another person's
private data. Use your own disposable local fixtures; do not test against
production services or other people's accounts.

The maintained development line is `master`; there is no supported production
release or backport schedule. Reports are reviewed by the maintainer without
a guaranteed response time. Acknowledgment, remediation and disclosure are
coordinated privately. [Current dependency dispositions](DEPENDENCY_SECURITY.md)
record known findings and their limits; an open alert is not automatically a
confirmed exploitable application defect.

## Working safely

Canonical security rules for all agent and human work in this repo, regardless of which tool or model is running. `.cursor/rules/security.mdc` mirrors this file for Cursor's always-apply mechanism; this file is the home, the rule is the mirror.

## Install And Setup Scripts

- Never run install scripts from unknown repos without explaining what they do first.
- Before running setup commands (`npm install`, `npx`, `brew`, `pip`, etc.), inspect:
  - `package.json` and lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
  - `postinstall`, `preinstall`, and other lifecycle scripts
  - Relevant config files that those commands may read or modify
- Prefer documented project scripts from this repo over ad hoc remote installers.
- When `package-lock.json` exists, prefer `npm ci` over `npm install` for reproducible installs.
- Avoid `npm install --force`, `npm install --legacy-peer-deps`, and similar override flags unless the user approves after you explain the risk and why the lockfile or peer-deps conflict cannot be resolved normally.
- Use npm `>=11.16.0 <12`; `package.json#devEngines` rejects unsupported
  package-manager versions and CI pins npm `11.17.0`.
- The repository `.npmrc` sets `strict-allow-scripts=true`, so installs fail
  when a dependency lifecycle script is not covered by the reviewed
  `package.json#allowScripts` policy.
- Dependency install-script approvals in `package.json#allowScripts` must be
  version-pinned after inspecting the exact script. The current reviewed
  approvals are `fsevents@2.3.3` (optional macOS watcher; packaged native
  binary) and `unrs-resolver@1.12.2` (ESLint resolver; postinstall repairs a
  missing platform binding). Future versions remain unapproved until reviewed.
  List pending entries read-only with
  `npm approve-scripts --allow-scripts-pending`.

## Shell Execution

- Never execute `curl | bash`, `wget | sh`, or equivalent remote pipe-to-shell patterns.
- Never run remote shell scripts, one-liners fetched from the internet, or obfuscated/encoded commands without explicit user approval after review.
- Prefer reading and understanding a script locally before execution when setup is required.
- Never paste text you did not author (board card or README text, ledger or
  PR excerpts, file contents, tool output) into a shell command line, even
  inside double quotes: `$(…)` and backticks are evaluated before the program
  receives its arguments. Write the text to a file with a file-writing tool
  (the editor's write tool), not through the shell, then pass
  `"$(cat <file>)"` so it reaches the program as a single unevaluated
  argument. A shell heredoc or `echo` is not a substitute: a line in the text
  equal to the heredoc delimiter closes the heredoc and the remaining lines
  run as commands, and `echo` re-evaluates the text on the command line.
- Treat package scripts and hooks, tests, JavaScript configuration, and other
  validation inputs from a changed or pull-request tree as executable code.
  If trust is not established by reviewing those surfaces against a trusted
  base, never run them on the agent host, outside the sandbox, or with agent
  credentials. Use disposable, credential-free isolation pinned to the exact
  SHA; host execution requires a completed trusted-base review.
- Do not run destructive commands (`rm -rf`, `git reset --hard`,
  `git clean -fdx`, mass file deletes) or destructive database commands
  against local/approved staging (`DROP`, mass row deletes) without explicit
  user approval. Production database actions are never approvable; they are
  forbidden below.
- Do not use `sudo` unless the user explicitly requests it and the command is necessary.

## Secrets And Sensitive Data

- Never expose `.env` files, API keys, tokens, cookies, or browser session data in chat, logs, commits, PRs, or screenshots.
- Never print, echo, or commit secret values. Redact or describe presence only (for example: "SUPABASE_ANON_KEY is set").
- Never expose Supabase service-role keys in client code or agent output.
- Treat credentials in terminal output, MCP responses, and error messages as sensitive; summarize without repeating values.
- If credentials are discovered in output, files, or history: stop repeating them, redact from any draft response, warn the user that exposure may have occurred, and recommend rotation if the value may have left a trusted boundary.

## Supabase Environments And Agent Boundaries

- Task 11 may configure and validate local Supabase plus one separate staging
  project. Production database access, migrations, writes, and destructive
  actions are unavailable to coding agents.
- Treat production database reads (including schema inspection), writes,
  drops, deletes, migrations, and credentials as **FORBIDDEN** for coding
  agents and MCP tools, not as high-impact actions that chat approval can
  authorize.
- The product may implement the protected in-app account-deletion flow owned by
  Task 19. Coding agents may implement and non-destructively validate that flow
  and prepare its manual verification checklist. An actual deletion must be
  initiated and executed manually by a human, never through an
  agent-controlled browser, MCP, SQL, or admin tool. Account deletion on local,
  staging, or production is **FORBIDDEN** for agents even with chat approval.
- Do not initialize, install, create/apply a migration, link a project, or
  change a remote environment from a planning-only task. Implementation needs
  explicit task authorization.
- The Expo bundle may contain only the project URL and a publishable key (or
  legacy anon key for compatibility). It must never contain a secret key,
  service-role key, database password, JWT signing secret, Supabase management
  token, or direct connection string.
- Treat RLS policies and Data API grants as separate controls. Task 11 enables
  RLS, revokes inherited `PUBLIC` / `anon` / `authenticated` privileges, and
  adds no positive client grants. Task 12 adds complete policies before
  rebuilding the explicit least-privilege client grant allowlist. Tests inspect
  effective privileges so access inherited through `PUBLIC` cannot be missed.
- The required trigger-only `SECURITY DEFINER` functions are
  `handle_new_user` and the aggregate-writing `handle_user_rating_change`
  entrypoint. Each uses
  `SET search_path = ''`, fully qualified relation names, and
  `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated`.
- All six Task 11 public-schema functions are internal helpers:
  `set_updated_at`, `reject_user_rating_identity_change`, `handle_new_user`,
  `create_zero_rating_aggregate`, `refresh_rating_aggregates`, and
  `handle_user_rating_change`. None is executable by `PUBLIC`, `anon`, or
  `authenticated`.
- `service_role` is server-only. Task 12 positively tests its exact allowlist
  and aggregate-trigger side effects, while secret scanning proves its key is
  absent from Expo.
- `user_ratings.private_note` is owner-only. Do not expose raw rating rows as
  public community content; Community Score comes from server-owned
  `rating_aggregates`.
- `profiles` is owner-only client data. `anon` receives no table privilege or
  policy, and `authenticated` may select only `profiles.id = auth.uid()` and
  update only `display_name`, `username`, and `avatar_url`.
- The accepted Task 12 forward-only migration creates complete policies before
  rebuilding the exact client / `service_role` table and column allowlists. The
  migration itself added no client integration. Task 14 provides the Expo
  client/query foundation, and Task 15 uses only its public client for
  anonymous published-catalog reads. No privileged credential is part of that
  screen path.
- Secret scanning is a required Task 11 deliverable. Validate it with a safe
  deliberate test pattern; never use a real credential as the test.
- Task 11 Packet 6 SQL tests under `supabase/tests/database/` assert
  deny-by-default table privileges (`has_table_privilege` for `PUBLIC` /
  `anon` / `authenticated`), zero policies on the seven core tables, and
  `EXECUTE` revoked on all six internal helpers. `npm run test:db` runs those
  pgTAP checks and then `scripts/test-db-concurrency.cjs`, which proves
  same-product writers serialize and overlapping fixture-only multi-product
  rating deletes both commit. The harness creates deterministic local fixture
  users but never deletes `auth.users`. Statement triggers derive distinct
  affected products from transition tables, map them to 64-bit advisory-lock
  keys, and acquire the actual keys in stable order. Run after `supabase start`
  (or use `npm run test:db:reset`). The local CLI link is gitignored; no project
  reference or credential is committed.
- Accepted Tasks 11–12 migration chronology, assertion totals, concurrency
  results, staging fallback checks, and the untouched-production boundary are
  preserved in
  [`docs/evidence/task-11-12-database-acceptance/RESULT.md`](evidence/task-11-12-database-acceptance/RESULT.md).
- Repo secret scan (zero new dependencies): `npm run check:secrets` runs
  `test:secrets` then scans allowlisted paths (`app/`, `assets/`, `src/`,
  `docs/`, `supabase/`, `scripts/`, `.github/`, plus skill/agent trees).
  Recognized text files under bundled `app/`, `assets/`, and `src/` and all
  recognized root text files are enumerated from disk even when gitignored or
  symlinked to regular files. Directory symlinks are not followed. Bundled
  coverage excludes images, fonts, and other binary assets. Root coverage
  includes dynamic Expo/EAS configuration such as `app.config.ts`,
  `app.config.js`, and `eas.json`, plus text dotfiles such as `.npmrc` and
  `.editorconfig`. It fails on the
  deliberate test token (constant `TEST_TOKEN` in
  `scripts/check-secrets.cjs`),
  exact-shape modern `sb_secret_` keys, explicit service-role key assignment
  forms with any non-empty value, JWTs whose payload claims
  `role: service_role`, direct PostgreSQL connection URIs, and
  database-password, JWT-signing-secret, or Supabase management-token assignment
  names with any non-empty value regardless of length. Quoted JSON/EAS
  database-password keys are covered. Dependency lockfiles are scanned for the
  same high-confidence patterns. JWT inspection also applies to `.env.example`;
  only genuinely non-secret fake placeholders pass.
  Findings print path, pattern name, and a redacted snippet only — never the
  full matched value. Prose mentions of `service_role` are allowed. Wired into
  `npm run check` and Expo CI. Self-test alone: `npm run test:secrets`. Do not
  leave the deliberate token in committed files.

### Session storage

- Task 16 auth session storage threat model:
  - Access and refresh tokens are sensitive authentication material.
  - AsyncStorage is not encrypted at rest.
  - Profile display fields do not drive the storage decision; tokens do.
  - Device compromise and local storage inspection are relevant risks.
  - RLS remains mandatory regardless of local token storage encryption.
  - **HUMAN ACCEPTED (Task 16 MVP tradeoff only):** keep AsyncStorage with the
    existing SSR-safe adapter for iPhone-first MVP + static web export, despite
    unencrypted at rest storage.
  - A SecureStore lifecycle experiment was proposed but **explicitly waived by
    the human for Task 16**. Do not claim the experiment was performed. Do not
    claim a universal 2048-byte SecureStore limit as the Task 16 rejection reason.
  - SecureStore / platform-secure storage may be reconsidered during later
    security/release hardening if a simple, tested Supabase session path exists
    without fragile chunking or custom encryption.
  - Never store service-role keys, passwords, or database credentials in
    client storage. Never log sessions, tokens, or full auth-user objects.

### Password recovery

- Task 18 password recovery:
  - Recovery uses Supabase Auth only
    (`resetPasswordForEmail` / `updateUser({ password })`). No custom recovery
    SQL, RLS changes, SECURITY DEFINER helpers, or service-role credentials.
  - Redirect allowlist for local/dev includes the `eazyreview` app scheme paths
    in `supabase/config.toml` for password recovery and signup confirmation.
    Staging and production redirect hosts are not Task 18 deliverables
    (Tasks 25–26 + human). Signup confirmation must send the two-slash app URL
    `eazyreview://auth/sign-in` as `emailRedirectTo`; otherwise Auth falls back
    to Site URL (often
    `http://localhost:3000`), which a physical device cannot open.
  - Physical-device local recovery reads the non-secret Auth email-link origin
    from `SUPABASE_AUTH_EXTERNAL_URL` in the gitignored root `.env`. It must be
    the device-reachable Mac LAN URL with `/auth/v1`; never put a key, token, or
    production host in that value.
  - Never log recovery tokens, access tokens, refresh tokens, passwords, or
    complete incoming recovery URLs. Diagnostics use coarse labels only.
  - Recovery request success copy is non-enumerating and must not reveal
    whether an email maps to an account. Known account-existence provider
    rejections return the same submitted outcome; transport/service failures
    remain visible without exposing provider text.
  - Password update forms enable only after a verified recovery phase; ordinary
    sessions and direct navigation cannot update via the recovery screen.
  - Password-update mutations never auto-retry and never queue offline.
  - A definitive missing/expired recovery session clears the verified form and
    exposes only the safe request-new-link state.
  - Local session storage remains the Task 16 AsyncStorage strategy; Task 18
    does not redesign session persistence.

### Protected account deletion

- Task 19 protected account deletion:
  - The client supplies only current-password bytes. Email is fixed to the
    signed-in principal; the exact isolated reauthentication bearer is pinned
    to one zero-body Function request and never enters UI/context/logs/evidence.
  - Method, body, and Bearer validation precede runtime-secret access. The
    server derives the target only from live `getUser` plus matching verified
    claims, requires recent password AMR, globally revokes refresh sessions,
    then hard-deletes that same caller once. No target ID or destructive retry.
  - Only stable `user_not_found` proves absence. Post-revocation ambiguity is
    never relabeled success or configuration failure; one non-destructive
    lookup may classify uncertain deletion. Logs use fixed labels only.
  - The Edge runtime alone reads the server credential. Expo, tests, evidence,
    screenshots, and chat contain no server credential or real bearer.
  - The local deletion guard stores only version/counter, Auth subject,
    monotonic revision/state/lease, optional explicitly adopted `session_id`,
    and predecessor state. It stores no token, email, password, profile,
    rating, note, or provider/deletion result and is not server retention.
  - All participating Auth storage uses one non-stealing Auth-operation lock
    plus one distinct storage lock in `Auth operation -> storage` order.
    Guard/session mutations require exact readback; blocked A reads/writes/
    removals/events fail closed; B/C and newer same-principal snapshots are
    preserved through exact principal/access/refresh/session-ID/revision checks.
    Storage identity resolves explicit key, then injected client, then singleton
    public environment. After storage preflight releases, guard arm drains
    earlier Auth work inside a short Auth/storage section and releases before
    isolated reauthentication, so rollback preserves a rotated A2 already
    persisted before arm.
  - Ordinary sign-out, invalid bootstrap cleanup, and recovery cleanup never
    call shared-client `auth.signOut`. They use isolated exact-bearer work and
    exact-remove only unchanged shared storage. Storage unavailability makes no
    signed-out authority claim.
  - Guard notifications are payload-free fixed change labels. Auth event,
    notification, mount, and foreground reconciliation isolate-validate and
    exact-recheck before publication; stale/unconfirmed finalization clears the
    initiating exemption before mandatory reconciliation.
  - The full unabortable recovery callback exchange remains outside the
    provider FIFO because wrapping it reproduced the accepted Task 18
    recovery/explicit-auth deadlock. Its guarded adoption is instead protected
    by the shared Auth/storage lock, exact storage comparison, and token-free
    `superseded` result.
  - Guarded same-principal recovery captures an operation-local exact settled
    or lease-expired-pending predecessor. Recovery-owned S2 events are
    maintenance-only until one serialized exact transaction adopts S2 and
    reads back the new guard/storage state; same-session-ID S2 is allowed.
    Newer A2, C, empty, malformed, blocked, changed, or unavailable authority is
    preserved, and the predecessor never enters guard metadata, context, logs,
    or evidence.
  - Superseded recovery isolate-validates B, then an application-owned CAS under
    provider FIFO and `Auth operation -> storage` may replace only exact,
    guard-allowed displaced A. Raw C, newer A2, empty, malformed, blocked, and
    uncertain authority is preserved with no retry or SDK Auth event. Deletion
    winner restoration performs no shared-session write; raw reconciliation,
    isolated validation, and a final exact recheck choose B/C. Payload-free
    signaling and A-only cache cleanup remain mandatory.
  - Forced recovery cleanup requires an exact displaced principal/access/
    refresh/session-ID/guard-revision snapshot. Unknown displacement never
    authorizes primary/companion removal or same-principal cache cleanup; valid
    allowed S1 is published only after isolated validation and exact recheck.
  - Global revocation invalidates refresh capability, not already-issued JWT
    signatures. Hosted JWT expiry must be verified at no more than 3,600
    seconds; residual-token and destructive staging checks remain human-only.
- Do not print Supabase project refs, keys, tokens, connection strings, or
  dashboard/MCP responses containing them. Report presence and validation
  status without echoing values.
