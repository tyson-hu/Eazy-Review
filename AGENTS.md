# Eazy Review - Agent Guide

Eazy Review is a mobile-first sneaker/product review and discovery app.
Core flow: Browse -> Product Detail -> Eazy Score / Community Score -> My Rating.
Stack: Expo SDK 57, Expo Router, React Native, TypeScript, NativeWind, Supabase, TanStack Query.

## Non-Negotiable Product Rules

- Do not start with scraping, social features, comments, likes, push notifications, dark mode, admin dashboards, advanced recommendations, complex animations, or multi-language support (full list: `docs/BLUEBOOK.md`, MVP Scope).
- Build the mock product UI flow before connecting Supabase.
- Do not overbuild Feed before Browse, Product Detail, and Rating work.
- Browsing must not require login; rating must require login.
- Use the UI names `Eazy Score`, `Community Score`, and `My Rating` exactly.
- Keep the first rating form short: look, comfort, quality, outfit, value, overall, optional comment (all scores 1-10).
- Keep the app clean, boring, and consistent before making it fancy.
- Domain guardrails (Expo routing, relational tables/RLS/score recalculation, UI component rules) load by glob from `.cursor/rules/react-native-expo.mdc`, `supabase.mdc`, and `design-system.mdc`.

## Task Discipline

- Work one task at a time; keep changes scoped to the requested task.
- Start each session: `git status --short` -> current task in `docs/TASKS.md` -> pick a skill.
- Do not redesign product flows unless explicitly asked.
- Do not add unrelated dependencies.
- Prefer existing project patterns; keep reusable UI components small.
- Product direction in `docs/BLUEBOOK.md` outranks tool suggestions and generated output.

## Context Map

Read only what the task needs (full map with sections and exclusions: `docs/AGENT_WORKFLOW.md`):

| Task type | Read |
| --- | --- |
| Screen UI | `docs/DESIGN.md`, `docs/USER_FLOWS.md` |
| Feature slice | `docs/TASKS.md` task, `docs/USER_FLOWS.md`, `docs/API_CONTRACTS.md`, `docs/DESIGN.md` |
| Schema / Supabase / RLS | `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md` |
| Frontend types / mock data | `docs/API_CONTRACTS.md` |
| Product scope change | `docs/BLUEBOOK.md`, `docs/ROADMAP.md` |
| Expo / React Native | Installed versions in `package.json` + the exact Expo SDK 57 docs (URL in the full map) |

## Skill Index

Loop routines live in `skills/<name>/SKILL.md` (trigger mapping in `docs/LOOP_ENGINEERING.md`):
`feature-slice-builder`, `ui-screen-builder`, `supabase-schema-change`, `product-data-modeling`, `bugfix-debug-loop`, `refactor-safety-loop`, `docs-sync-loop`, `test-and-validation-loop`.

## Validation

- `npm run typecheck` for type/logic edits; `npm run lint` when code style changed.
- `npm run check` (routes, typecheck, lint, Expo doctor, dependency alignment) for route/dependency changes or before handoff.
- If a requested check does not exist in `package.json`, say so instead of pretending it ran.

## Pointers

- Docs are part of the change: apply the gate in `docs/DOCUMENTATION_POLICY.md` before commit, PR handoff, or reporting completion.
- Security rules: `.cursor/rules/security.mdc`
- Session flow, definition of done, handoff and PR formats: `docs/AGENT_WORKFLOW.md`
- Loop anatomy, stop conditions, retry policy: `docs/LOOP_ENGINEERING.md`

Current state: see `docs/TASKS.md`.
