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
- Domain guardrails (Expo routing, relational tables/RLS/score recalculation, UI component rules) live in `.cursor/rules/react-native-expo.mdc`, `supabase.mdc`, and `design-system.mdc`. Cursor attaches them by glob; if your tool does not, read the matching rule file before touching Expo/routing, Supabase/data, or UI code.

## Task Discipline

- Work one task at a time; keep changes scoped to the requested task.
- Start each session: `git status --short` -> current task in `docs/TASKS.md` -> pick a skill.
- Do not redesign product flows unless explicitly asked.
- Do not add unrelated dependencies.
- Prefer existing project patterns; keep reusable UI components small.
- Product direction in `docs/BLUEBOOK.md` outranks tool suggestions and generated output.
- State lives in files, not chat: at a session boundary (phase done, topic switch, overloaded context) stop adding work, write `docs/notes/handoff.md` (`skills/session-handoff`), and tell the user to start a new session. When debugging stalls, write `docs/notes/blocker-<topic>.md` (`skills/blocker-note`) instead of retrying. Triggers: `docs/AGENT_WORKFLOW.md`, Session Boundaries And State Persistence.
- Resuming a session: read `AGENTS.md`, the spec, and `docs/notes/handoff.md`, then restate the plan before editing.

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
| Mobile simulator / web mobile preview / UX screenshot audit | `skills/interactive-preview-loop` → `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`, `docs/evidence/README.md`, `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md` |

## Skill Index

Loop routines live in `skills/<name>/SKILL.md` (trigger mapping in `docs/LOOP_ENGINEERING.md`):
`feature-slice-builder`, `ui-screen-builder`, `supabase-schema-change`, `product-data-modeling`, `bugfix-debug-loop`, `refactor-safety-loop`, `docs-sync-loop`, `test-and-validation-loop`, `interactive-preview-loop`, `session-handoff`, `blocker-note`, `skill-creator`.

Skill lifecycle is a hybrid rule: the agent proposes, the human approves, the agent implements after approval. Proactively propose a skill after the same pattern has been explained 3+ times, but never create, delete, merge, or substantially modify skill files — or edit the skill indexes here or in `docs/LOOP_ENGINEERING.md` — without explicit approval. Routine and proposal format: `skills/skill-creator`.

## Validation

- `npm run typecheck` for type/logic edits; `npm run lint` when code style changed.
- `npm run check` (routes, typecheck, lint, Expo doctor, dependency alignment) for route/dependency changes or before handoff.
- If a requested check does not exist in `package.json`, say so instead of pretending it ran.
- `expo-doctor` / `expo install --check` (and thus the Expo tail of `npm run check`) must run **outside the agent sandbox** — sandboxed runs can false-pass doctor or `EPERM` on `~/.expo`. Canonical detail: `docs/AGENT_WORKFLOW.md`, Validation Commands → Expo doctor and dependency checks — agent sandbox.

## Pointers

- Docs are part of the change: apply the gate in `docs/DOCUMENTATION_POLICY.md` before commit, PR handoff, or reporting completion.
- Delegation policy: `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy. Active and conditionally available project subagents live in `.cursor/agents/`; role status, invocation boundaries, and the execution sequence live in `docs/AGENT_WORKFLOW.md`.
- Security rules: `docs/SECURITY.md`
- Session flow, definition of done, handoff and PR formats: `docs/AGENT_WORKFLOW.md`
- Loop anatomy, stop conditions, retry policy: `docs/LOOP_ENGINEERING.md`
- Interactive mobile/web preview and UX screenshot audits: `skills/interactive-preview-loop` (SOPs + `docs/evidence/`)

Current state: see `docs/TASKS.md`.
