# Eazy Review - Agent Guide

Eazy Review is a mobile-first sneaker/product review and discovery app.
Core flow: Browse -> Product Detail -> Eazy Score / Community Score -> My Rating.
Stack: Expo SDK 57, Expo Router, React Native, TypeScript, NativeWind, Supabase;
the Expo Supabase client and TanStack Query foundation shipped in Task 14
(screens still mock-backed until Task 15+).

## Non-Negotiable Product Rules

- Do not start with scraping, social features, comments, likes, push notifications, dark mode, admin dashboards, advanced recommendations, complex animations, or multi-language support (full list: `docs/BLUEBOOK.md`, MVP Scope).
- Build the mock product UI flow before connecting Supabase.
- Do not overbuild Feed before Browse, Product Detail, and Rating work.
- Browsing must not require login; rating must require login.
- Use the UI names `Eazy Score`, `Community Score`, and `My Rating` exactly.
- Keep the first rating form short: the ten shared `sneaker-10-v1`
  dimensions (0–10 half-steps), live derived My Rating (0–100), and optional
  private note. No editable Overall.
- Keep the app clean, boring, and consistent before making it fancy.
- Domain guardrails (Expo routing, relational tables/RLS/score recalculation, UI component rules) live in `.cursor/rules/react-native-expo.mdc`, `supabase.mdc`, and `design-system.mdc`. Cursor attaches them by glob; if your tool does not, read the matching rule file before touching Expo/routing, Supabase/data, or UI code.

## Task Discipline

- Work one task at a time; keep changes scoped to the requested task.
- Start each session: `git status --short` -> current task in `docs/TASKS.md`
  -> select the route in `docs/LOOP_ENGINEERING.md` (a matching skill or its
  explicit no-skill workflow).
- Use the generated `docs/DECISIONS.md` index to find the current task or area, then open only the linked decision records; use the legacy archive only for historical reasoning.
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
| Feature slice | `docs/TASKS.md` task, `docs/USER_FLOWS.md`, `docs/API_CONTRACTS.md`, `docs/DESIGN.md`; for Tasks 15–19, also the task-specific data, security, and tool-policy documents required by `skills/feature-slice-builder` |
| Schema / Supabase / RLS | `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md` |
| Frontend types / mock data | `docs/API_CONTRACTS.md` |
| Product scope change | `docs/BLUEBOOK.md`, `docs/ROADMAP.md` |
| Expo / React Native | Installed versions in `package.json` + the exact Expo SDK 57 docs (URL in the full map) |
| Mobile simulator / web mobile preview / UX screenshot audit | `skills/interactive-preview-loop` → `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`, `docs/evidence/README.md`, `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md` |

## Skill Index

Loop routines live in `skills/<name>/SKILL.md` (trigger mapping in `docs/LOOP_ENGINEERING.md`; authoritative discovery metadata in `skills/manifest.json`):
`feature-slice-builder`, `ui-screen-builder`, `supabase-schema-change`, `product-data-modeling`, `pr-human-review`, `pr-review-remediation`, `bugfix-debug-loop`, `refactor-safety-loop`, `docs-sync-loop`, `test-and-validation-loop`, `interactive-preview-loop`, `session-handoff`, `blocker-note`, `skill-creator`.

Generate both discovery-wrapper trees from the manifest with `npm run skills:generate`; do not edit generated wrappers by hand.

Skill lifecycle is a hybrid rule: the agent proposes, the human approves, the agent implements after approval. The three-use threshold gates agent-proactive proposals only. The human may direct a reviewed skill addition without three prior uses; that waives **only** the three-use threshold. Explicit intent, scoped draft approval, overlap checks, quality bar, security/abuse bar, and post-write proof still apply on both paths (`skills/skill-creator`, Remaining gate). Never create, delete, merge, or substantially modify skill files — or edit the skill indexes here, in `docs/LOOP_ENGINEERING.md`, or in `skills/manifest.json` — without that approval. Routine and proposal format: `skills/skill-creator`.

## Validation

- `npm run typecheck` for type/logic edits; `npm run lint` when code style changed.
- `npm test` for jest-expo frontend unit tests (Task 14 harness and later
  screen tests).
- `npm run types:generate` / `npm run types:check` for local Supabase database
  types (`src/types/database.generated.ts`).
- `npm run test:agent-infra` for the manifest/checker unit suite and
  `npm run check:agent-infra` for the repository document, mirror, dependency,
  stale-term, impact-rule, and task-graph contract.
- `npm run check:skill-wrappers` after canonical skill, manifest, generator, or discovery-wrapper edits (also part of `npm run check`).
- `npm run decisions:check` after decision-record or decision-index tooling edits (also part of `npm run check`).
- `npm run check:readonly` is the verifier-safe gate: skill wrappers, decision
  index, secrets, agent infrastructure, typecheck, and lint. It intentionally
  does not prepare routes or run the Expo cache-owning checks.
- `npm run prepare:routes` is parent/CI-owned preparation. After it runs, check
  tracked config drift before delegating read-only verification.
- `npm run check:expo` is the parent-owned full Expo gate: route preparation,
  read-only checks, frontend unit tests, Expo Doctor, and dependency alignment.
  `npm run check` remains an alias for this full handoff gate.
- If a requested check does not exist in `package.json`, say so instead of pretending it ran.
- `expo-doctor` / `expo install --check` (and thus `check:expo` / `check`) must
  run **outside the agent sandbox** — sandboxed runs can false-pass doctor or
  `EPERM` on `~/.expo`. Canonical detail: `docs/AGENT_WORKFLOW.md`, Validation
  Commands → Expo doctor and dependency checks — agent sandbox.

## Pointers

- Docs are part of the change: apply the gate in `docs/DOCUMENTATION_POLICY.md` before commit, PR handoff, or reporting completion.
- Decision recording rules and the ADR template: `docs/decisions/README.md` (the `docs/DECISIONS.md` index is generated).
- Delegation policy: `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy. Active and conditionally available project subagents live in `.cursor/agents/`; role status, invocation boundaries, and the execution sequence live in `docs/AGENT_WORKFLOW.md`.
- Security rules: `docs/SECURITY.md`
- Session flow, definition of done, handoff and PR formats: `docs/AGENT_WORKFLOW.md`
- Loop anatomy, stop conditions, retry policy: `docs/LOOP_ENGINEERING.md`
- Interactive mobile/web preview and UX screenshot audits: `skills/interactive-preview-loop` (SOPs + `docs/evidence/`)

Current state: see `docs/TASKS.md`.
