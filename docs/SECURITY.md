# Security Rules

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

## Shell Execution

- Never execute `curl | bash`, `wget | sh`, or equivalent remote pipe-to-shell patterns.
- Never run remote shell scripts, one-liners fetched from the internet, or obfuscated/encoded commands without explicit user approval after review.
- Prefer reading and understanding a script locally before execution when setup is required.
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
  Task 15. Coding agents may implement and non-destructively validate that flow
  and prepare its manual verification checklist. An actual deletion must be
  initiated and executed manually by a human, never through an
  agent-controlled browser, MCP, SQL, or admin tool. Account deletion on local,
  staging, or production is **FORBIDDEN** for agents even with chat approval.
- Do not initialize, install, create/apply a migration, link a project, or
  change a remote environment from a planning-only task. Implementation needs
  explicit task authorization.
- The Expo bundle may contain only the project URL and a publishable key (or
  legacy anon key for compatibility). It must never contain a secret key,
  service-role key, database password, or direct connection string.
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
  (or use `npm run test:db:reset`). The current local gate passed 2026-07-28
  with 183 pgTAP assertions and both races. The explicitly authorized staging
  target received all four Task 11 migrations
  on 2026-07-28. Migration parity, 7/7-table RLS state, zero policies, zero
  prohibited table/helper privileges, the original seven
  transaction-rolled-back behavior checks, linked lint, and zero test-fixture
  residue passed. Review-remediation re-acceptance additionally confirmed the
  old row trigger is absent, all three transition-table statement
  triggers are present, actual 64-bit lock-key ordering is installed, and
  client helper execution remains denied. A transaction-rolled-back
  multi-product insert/update/delete smoke restored both aggregates to
  zero/null after delete and left no fixture residue. The local CLI link is
  gitignored; no project reference or credential is committed. Production was
  not touched.
- Repo secret scan (zero new dependencies): `npm run check:secrets` runs
  `test:secrets` then scans allowlisted paths (`app/`, `src/`, `docs/`,
  `supabase/`, `scripts/`, `.github/`, all root files on disk with recognized
  text formats even when gitignored, plus skill/agent trees). Root coverage
  includes dynamic Expo/EAS configuration such as `app.config.ts`,
  `app.config.js`, and `eas.json`, plus text dotfiles such as `.npmrc` and
  `.editorconfig`. It fails on the
  deliberate test token (constant `TEST_TOKEN` in
  `scripts/check-secrets.cjs`),
  exact-shape modern `sb_secret_` keys, service-role key assignment forms with
  a non-empty secret-like value, JWTs whose payload claims
  `role: service_role`, direct PostgreSQL connection URIs, and
  database-password assignments. Dependency lockfiles are scanned for the same
  high-confidence patterns. JWT inspection also applies to
  `.env.example`; only genuinely non-secret fake placeholders pass. Findings
  print path, pattern name, and a redacted snippet only — never the full
  matched value. Prose mentions of `service_role` are allowed. Wired into
  `npm run check` and Expo CI. Self-test alone: `npm run test:secrets`. Do not
  leave the deliberate token in committed files.
- Do not print Supabase project refs, keys, tokens, connection strings, or
  dashboard/MCP responses containing them. Report presence and validation
  status without echoing values.
