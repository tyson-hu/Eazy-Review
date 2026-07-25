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
- Do not run destructive commands (`rm -rf`, `git reset --hard`, `git clean -fdx`, database drops, mass file deletes) without explicit user approval.
- Do not use `sudo` unless the user explicitly requests it and the command is necessary.

## Secrets And Sensitive Data

- Never expose `.env` files, API keys, tokens, cookies, or browser session data in chat, logs, commits, PRs, or screenshots.
- Never print, echo, or commit secret values. Redact or describe presence only (for example: "SUPABASE_ANON_KEY is set").
- Never expose Supabase service-role keys in client code or agent output.
- Treat credentials in terminal output, MCP responses, and error messages as sensitive; summarize without repeating values.
- If credentials are discovered in output, files, or history: stop repeating them, redact from any draft response, warn the user that exposure may have occurred, and recommend rotation if the value may have left a trusted boundary.
- Prefer secret scanning in CI / pre-commit for day-to-day work; treat accidental key commits as rotate-immediately incidents.
- **Task 11 requirement:** land secret scanning for this repo (CI step and/or pre-commit hook) before or with the first Supabase migration packet. Prefer alone is not enough for Task 11 acceptance.

## Supabase Environments And Agent Boundaries

Canonical schema and RLS expectations: `docs/DATA_MODEL.md`. Task order: `docs/TASKS.md` Tasks 11–18.

- Keep **local**, **staging**, and **production** separated. Coding agents may use local and explicitly approved staging only.
- Never grant coding agents production database permissions, automated production migrations, or service-role use against production.
- Never put the service-role key in the Expo / mobile bundle, web client, or committed env examples meant for the app.
- Expo may receive only the project URL and anon (publishable) key, validated at startup when the client is introduced.
- Define and test RLS **before** wiring Browse / Detail / Rating to Supabase. Unauthorized scenarios in Task 12 are required, not optional polish.
- **Task 11:** enable RLS on every new table in the create migration (deny-by-default). Do not grant `anon` / `authenticated` table privileges in Task 11.
- **Task 12:** add complete policies, then explicit Data API `GRANT`s for `anon` / `authenticated`, then authorization tests. Never grant client roles before the authorizing policies exist. Before rebuilding the allowlist, `REVOKE ALL PRIVILEGES` on each client-facing table from `anon` / `authenticated` so inherited table-wide defaults cannot defeat column-level grants.
- `SECURITY DEFINER` aggregate helpers must `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated` (trigger-only).
- Catalog policies must enforce **published** products (`is_published`); drafts are not anonymously readable.
- Rating **INSERT/UPDATE** policies must also require the referenced product to be published (FK existence alone is not enough). Owner **DELETE** of an existing rating may remain allowed after unpublish.
- Client Data API grants are least-privilege and **column-level** where writes are allowed: `profiles` UPDATE only `display_name` / `username` / `avatar_url`; `user_ratings` INSERT permits `product_id`, `user_id`, score fields and `private_note`; UPDATE permits only score fields and `private_note` (not `id` / `created_at` / `updated_at`). Timestamps are trigger-maintained. Identity columns remain immutable after insertion and must never appear in the UPDATE set.
- Profile rows are created by a protected `auth.users` AFTER INSERT trigger (`handle_new_user`), not by client INSERT. Clients must not receive `profiles` INSERT grants or policies.
- Connected rating writes must use a **security-definer** helper **or** insert vs score-only update with unique-conflict retry (`23505` → score/private-note-only update). Do not use PostgREST `.upsert()` payloads that require UPDATE on `product_id` / `user_id`. When the preferred definer helper is used, it must derive the owner from `auth.uid()` (no trusted client `user_id`), reject unauthenticated calls and unpublished products, set `product_id` + `auth.uid()` on insert and update only scores + `private_note` on conflict, use `SET search_path = ''` with fully qualified names, and grant `EXECUTE` only to `authenticated` (`REVOKE` from `PUBLIC` / `anon`).
- `private_note` is owner-only. Do not add public `SELECT` on `user_ratings` while notes share that row. Connected UI labels the field **Private note**, not Comment.
- `rating_aggregates` are server-owned. Clients must not insert, update, or delete aggregate rows; Community Score recalculation stays in security-definer SQL that clients cannot execute. Refresh must be serialized per product so concurrent ratings cannot leave a stale aggregate. Every product insert ensures a zero-count aggregate row.
- `user_ratings.product_id` and `user_ratings.user_id` are immutable after insert (trigger-enforced, not only column grants).
- Clients must never be able to mark purchases as verified or otherwise self-attest privileged provenance flags.
- Prefer staging-only confirmation in every schema packet completion report (“no production project touched”).
- MCP (when used): read-only inspection of local/staging is acceptable; production database access, production writes, service-role secrets for production, account deletion, and production migrations are **FORBIDDEN** — not HIGH IMPACT and not approvable via chat (`docs/MCP_WORKFLOW.md`).
