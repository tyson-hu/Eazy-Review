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
- **Task 12:** add complete policies, then explicit Data API `GRANT`s for `anon` / `authenticated`, then authorization tests. Never grant client roles before the authorizing policies exist.
- `SECURITY DEFINER` aggregate helpers must `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated` (trigger-only).
- Catalog policies must enforce **published** products (`is_published`); drafts are not anonymously readable.
- `private_note` is owner-only. Do not add public `SELECT` on `user_ratings` while notes share that row.
- `rating_aggregates` are server-owned. Clients must not insert, update, or delete aggregate rows; Community Score recalculation stays in security-definer SQL that clients cannot execute.
- `user_ratings.product_id` is immutable after insert.
- Clients must never be able to mark purchases as verified or otherwise self-attest privileged provenance flags.
- Prefer staging-only confirmation in every schema packet completion report (“no production project touched”).
- MCP (when used): read-only inspection of local/staging is acceptable; production writes, service-role secrets, account deletion, RLS changes, and migrations stay outside ordinary MCP tool authority (`docs/MCP_WORKFLOW.md`).
