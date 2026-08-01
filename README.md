# Eazy Review

Eazy Review is a mobile-first product review and discovery app focused on sneakers and products. The core loop is simple: browse products, open a product detail page, compare Eazy Score with Community Score, submit or edit My Rating, and find rated products later.

The repository contains the accepted mock Browse → Product Detail → Rating
Form experience plus the accepted local/staging Supabase schema and
least-privilege authorization foundation. Expo still uses mock data and
session-only My Rating state; `docs/TASKS.md` is the sole current-status and
implementation-order source.

## Documentation Map

- `docs/BLUEBOOK.md`: master product and engineering plan.
- `docs/DESIGN.md`: sole product UI source of truth (principles, tokens,
  typography, elevation, components, and screen rules).
- `docs/research/apple-visual-analysis.md`: archived, non-authoritative visual
  research.
- `docs/DOCUMENTATION_POLICY.md`: required doc-update rules for future changes.
- `docs/SECURITY.md`: security rules for install, shell, and secrets handling (all agents and humans).
- `docs/AGENT_WORKFLOW.md`: agent session flow, context map, definition of done, handoff and PR formats.
- `docs/LOOP_ENGINEERING.md`: loop anatomy, stop conditions, retry policy, and the loop-to-skill index.
- `docs/USER_FLOWS.md`: core user journeys and route expectations.
- `docs/DATA_MODEL.md`: Supabase schema, RLS, triggers, and rating summary logic.
- `docs/API_CONTRACTS.md`: frontend types, API functions, and query keys.
- `docs/ROADMAP.md`: milestone plan.
- `docs/TASKS.md`: current implementation task order.
- `docs/MCP_WORKFLOW.md`: coding-agent, Stitch, and MCP workflow rules.
- `docs/STITCH_PROMPTS.md`: reusable UI exploration prompts.
- `docs/DECISIONS.md`: generated index of current high-impact decisions.
- `docs/decisions/`: human-authored ADR-style records, recording rules, and the legacy archive.
- `docs/RELEASE_CHECKLIST.md`: release-readiness checklist.

## Stack Direction

- Expo SDK 57
- Expo Router
- React Native
- TypeScript
- NativeWind
- Supabase (schema/authorization shipped; Expo client planned in Task 14)
- TanStack Query (planned in Task 14)

Before writing Expo code, read the exact SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/`.

## Quality Checks

Validation commands and when to use each live in `docs/AGENT_WORKFLOW.md` (Validation Commands). For CI or local web-bundle verification: `CI=1 npx expo export --platform web`.
Decision records use `npm run decisions:build` and `npm run decisions:check`.
Use npm `>=11.16.0 <12` (CI pins `11.17.0`). The repository rejects unsupported
npm versions and fails dependency installs when a lifecycle script is not
covered by the version-pinned `package.json#allowScripts` policy.
The read-only repository gate is `npm run check:readonly`; the parent-owned
full Expo gate is `npm run check:expo` (`npm run check` is its alias). Secret
scanning uses `npm run check:secrets` and is included in both gates; it
includes recognized text files under bundled `app/`, `assets/`, and `src/`,
even when gitignored or symlinked to regular files, plus every recognized
root-level text file present on disk, including dynamic Expo/EAS configs and
dotfiles such as `.npmrc` and `.editorconfig`. Dependency lockfiles are
included, and direct PostgreSQL URLs plus non-empty service-role,
database-password, JWT-signing-secret, or Supabase management-token assignments
fail the scan regardless of value length.

## Local Supabase

Requires Docker Desktop and the Supabase CLI (`brew install supabase/tap/supabase`).

```bash
supabase start              # once per machine session
npm run test:db:reset       # clean reset + pgTAP + concurrency races
supabase stop
```

Expo must receive only the project URL and publishable/legacy anon key (see
`.env.example`). Never put a service-role key in the mobile bundle
(`docs/SECURITY.md`). Remote staging actions require a separate explicit human
authorization; production database work is forbidden for agents. Accepted
Tasks 11–12 database evidence is preserved in
`docs/evidence/task-11-12-database-acceptance/RESULT.md`.

## Documentation Discipline

Doc-update rules live in `docs/DOCUMENTATION_POLICY.md`; apply them before commit/PR handoff.

## Current Product State

Browse → Product Detail → Rating Form mock UX and the Tasks 11–12 database and
authorization foundation are accepted. Expo remains disconnected; real reads,
authentication, and writes stay owned by later tasks. Task 13's two-product
deterministic SQL seed is next and has not started. `docs/TASKS.md` is the sole
current-status and implementation-order ledger.
