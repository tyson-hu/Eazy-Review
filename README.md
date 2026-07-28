# Eazy Review

Eazy Review is a mobile-first product review and discovery app focused on sneakers and products. The core loop is simple: browse products, open a product detail page, compare Eazy Score with Community Score, submit or edit My Rating, and find rated products later.

The repo currently starts from an Expo Router app shell. The project infrastructure docs define the intended architecture and implementation order.

## Documentation Map

- `docs/BLUEBOOK.md`: master product and engineering plan.
- `docs/DESIGN.md`: product UI/UX (identity, principles, component and screen rules; app Visual System).
- `docs/UI_STYLE.md`: visual style language (full token prose, typography, elevation).
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
- Supabase
- TanStack Query

Before writing Expo code, read the exact SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/`.

## Quality Checks

Validation commands and when to use each live in `docs/AGENT_WORKFLOW.md` (Validation Commands). For CI or local web-bundle verification: `CI=1 npx expo export --platform web`.
Decision records use `npm run decisions:build` and `npm run decisions:check`.
Secret scanning: `npm run check:secrets` (also part of `npm run check`); it
includes every recognized root-level text file present on disk, even when
gitignored, including dynamic Expo and EAS configs.

## Local Supabase (Task 11)

Requires Docker Desktop and the Supabase CLI (`brew install supabase/tap/supabase`).

```bash
supabase start              # once per machine session
npm run test:db:reset       # clean reset + pgTAP + concurrency races
supabase stop
```

Expo must receive only the project URL and publishable/legacy anon key (see `.env.example`). Never put a service-role key in the mobile bundle (`docs/SECURITY.md`). The human-authorized staging target is linked through gitignored local CLI metadata; no project reference or credential is committed. Production database work is forbidden for agents.

## Documentation Discipline

Doc-update rules live in `docs/DOCUMENTATION_POLICY.md`; apply them before commit/PR handoff.

## First Build Goal

Browse → Product Detail → Rating Form mock UX is complete (Tasks 6–10). Task 11
core schema and PR review remediation passed local and human-authorized staging
acceptance across all four forward-only migrations.
Task 12 (policies/grants) has not started. Do not connect Expo to Supabase until
Task 12 authorization is in place for the reads you need.
