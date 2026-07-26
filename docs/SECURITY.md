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

## Supabase Environments And Agent Boundaries

- Task 11 may configure and validate local Supabase plus one separate staging
  project. Production database access, migrations, writes, and destructive
  actions are unavailable to coding agents.
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
- `service_role` is server-only. Task 12 positively tests its exact allowlist
  and aggregate-trigger side effects, while secret scanning proves its key is
  absent from Expo.
- `user_ratings.private_note` is owner-only. Do not expose raw rating rows as
  public community content; Community Score comes from server-owned
  `rating_aggregates`.
- Secret scanning is a required Task 11 deliverable. Validate it with a safe
  deliberate test pattern; never use a real credential as the test.
- Do not print Supabase project refs, keys, tokens, connection strings, or
  dashboard/MCP responses containing them. Report presence and validation
  status without echoing values.
