# Agent Workflow

This is the canonical process doc for working in this repo: how a session starts, what to read for each task type, what "done" means, and the exact handoff and PR summary formats. `AGENTS.md` holds the compact version; this file holds the authoritative detail. Loop mechanics (stop conditions, retries, memory) live in `docs/LOOP_ENGINEERING.md`.

## Session Flow

Every working session follows the same three steps:

1. Run `git status --short`. Do not overwrite unrelated uncommitted changes.
2. Read the current task in `docs/TASKS.md`.
3. Pick the matching skill from the loop index in `docs/LOOP_ENGINEERING.md` (skill routines live in `skills/<name>/SKILL.md`) and follow its routine.

If no skill matches, work directly but still apply the context map, definition of done, and handoff format below.

When continuing work from a previous session: read `AGENTS.md`, the spec, and `docs/notes/handoff.md` (plus any linked `docs/notes/blocker-*.md`), then restate the plan before editing anything.

## Session Boundaries And State Persistence

Chat is the workbench; files are the hard drive. For long tasks, loops, and cross-day collaboration, state must never live only in chat — `docs/notes/handoff.md`, `docs/notes/blocker-*.md`, `docs/TASKS.md`, issue boards, and PR checklists are the external state the next session reads, not old transcripts.

Tell the user it is time to switch to a new session when:

- A feature phase is complete.
- A bug is fixed and the next task is unrelated.
- Backend work is done and the next work is UI.
- Exploration is done and implementation is next.
- The session is overloaded: context is noisy, answered questions get re-asked, or corrected mistakes come back.

At a boundary, stop adding work. Whether the user asks for a handoff or the agent proposes one, run `skills/session-handoff` to write `docs/notes/handoff.md`, then hand the user this resume prompt for the new session:

```txt
Read AGENTS.md, the spec, and docs/notes/handoff.md.
Continue from the previous session, but restate the plan before editing.
```

When debugging stalls instead (2+ failures on the same problem, 20–30+ minutes without progress, or plan A → B → A looping), run `skills/blocker-note` to write `docs/notes/blocker-<topic>.md` and stop attempting fixes in that session.

## Context Map

Read only what the task type needs. Do not read `docs/BLUEBOOK.md` "before any work" — read it only when product scope or direction is actually in question.

| Task type | Read | Do not read |
| --- | --- | --- |
| Build or redesign one screen's UI | `docs/DESIGN.md` (Visual System, Component Rules, and that screen's section in Screen-Level Rules), `docs/USER_FLOWS.md` (that screen's flow) | `docs/BLUEBOOK.md`, `docs/DATA_MODEL.md` |
| Feature slice spanning data + UI (a `docs/TASKS.md` task) | The task in `docs/TASKS.md`, `docs/USER_FLOWS.md` (relevant flow), `docs/API_CONTRACTS.md` (types and functions), `docs/DESIGN.md` (component rules for its screens) | `docs/BLUEBOOK.md`, `docs/MCP_WORKFLOW.md` |
| Schema, Supabase, RLS, migrations, rating summaries | `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md` (affected contracts) | `docs/DESIGN.md`, `docs/STITCH_PROMPTS.md` |
| Frontend data shape, types, mock data, folder structure | `docs/API_CONTRACTS.md`; `docs/DATA_MODEL.md` only if a database contract changes | `docs/DESIGN.md` screen sections, `docs/BLUEBOOK.md` |
| Bug fix | The failing flow in `docs/USER_FLOWS.md`, plus the doc for the layer the bug lives in (`docs/DESIGN.md` for UI, `docs/API_CONTRACTS.md` for data, `docs/DATA_MODEL.md` for database) | Everything else |
| Refactor (no behavior change) | `docs/API_CONTRACTS.md` (folder structure and contracts covering the moved code) | Product and design docs |
| Docs sync after code drift | `docs/DOCUMENTATION_POLICY.md` (Document Update Map) | Docs the change does not affect |
| Validation / check run | Validation Commands section below in this file | Product docs |
| Product scope or direction change | `docs/BLUEBOOK.md`, `docs/ROADMAP.md` | — |
| Stitch, MCP, or external-tool workflow | `docs/MCP_WORKFLOW.md`, `docs/STITCH_PROMPTS.md` | `docs/DATA_MODEL.md` |
| Expo / Expo Router / React Native specifics | Installed versions in `package.json`, plus the exact Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/` | Older Expo SDK docs |
| Release preparation | `docs/RELEASE_CHECKLIST.md` | — |
| Resuming a previous session | `AGENTS.md`, the spec, `docs/notes/handoff.md`, linked `docs/notes/blocker-*.md` | Old chat transcripts |

Example: building the Browse screen needs the Browse flow in `docs/USER_FLOWS.md` and the product card rules in `docs/DESIGN.md` — not `docs/BLUEBOOK.md`, not `docs/DATA_MODEL.md`.

## Definition Of Done

A task is not done until:

- Docs affected by the change are updated per `docs/DOCUMENTATION_POLICY.md`.
- `docs/TASKS.md` reflects the completed work and any newly discovered follow-up work.
- `docs/DECISIONS.md` has an entry for each meaningful product, architecture, data, workflow, design-system, dependency, or toolchain decision, using its entry template.
- Validation was run, or skipped commands are named with a reason.
- The Human-readable handoff (below) is written, listing docs updated or stating `No documentation update needed` with a reason.

## Validation Commands

This section is the canonical home for validation commands; `AGENTS.md` carries the compact list and `README.md` carries the setup-facing pointer.

Pick the narrowest command that covers the change:

- `npm run typecheck` — TypeScript only. Fastest; enough for pure type or logic edits.
- `npm run lint` — ESLint via Expo. Add it when code style or imports changed.
- `npm run check` — typed-route generation, typecheck, lint, Expo doctor, and Expo dependency alignment. Use for route changes, dependency changes, or before handing off a finished task.
- `npm run generate:routes` — regenerates typed routes; required before typecheck on clean checkouts.
- `CI=1 npx expo export --platform web` — verify the web bundle in CI or locally.
- Docs-only changes need no command; say so in Validation.

## Human-Readable Handoff

Every completed task ends with this exact five-section format:

```md
## What changed

## Why it matters

## What is safe

## What needs review

## Validation
```

Writing rules:

- **Why it matters** must name the effect on user, product, or developer behavior — what someone sees, does, or maintains differently.
- **Validation** must state which commands ran and their results, or name each skipped command with the reason it was skipped.
- Plain English. No filler. A reader who was not in the session must understand it.

### Bad vs Good Summary

Bad:

```txt
Updated components.
```

Good:

```txt
Changed the product card so rating data comes from the normalized review object.
Browse and Feed now show the same Community Score for a product instead of two
different values. No schema or route changes. Needs review: score rounding when
review count is zero. Validation: npm run typecheck and npm run lint passed;
npm run check skipped because Expo doctor needs network access.
```

## PR Summary Template

Every PR body uses this format (mirrored in `.github/pull_request_template.md`):

```md
## What changed

## Why

## User-product effect

## Safety

## Validation

## Files changed

## Follow-ups
```

`Safety` covers what could break and why it will not (or what to watch). `Follow-ups` lists deferred work, each with a home in `docs/TASKS.md`.

## Canonical Homes

One home per instruction; everywhere else points, never restates.

| Content | Canonical home |
| --- | --- |
| Product direction, MVP scope, success criteria | `docs/BLUEBOOK.md` |
| Non-negotiable operating rules, task discipline, skill index | `AGENTS.md` |
| UI tokens, design principles, component and screen rules | `docs/DESIGN.md` |
| Schema, RLS, triggers, rating summary logic | `docs/DATA_MODEL.md` |
| Frontend types, API functions, query keys, folder structure | `docs/API_CONTRACTS.md` |
| Routes, user journeys, auth gates | `docs/USER_FLOWS.md` |
| Doc-update gate and Document Update Map | `docs/DOCUMENTATION_POLICY.md` |
| Security rules | `.cursor/rules/security.mdc` |
| Session flow, context map, definition of done, validation commands, handoff and PR formats | `docs/AGENT_WORKFLOW.md` (this file) |
| Session boundary triggers, state-persistence principle, resume prompt | `docs/AGENT_WORKFLOW.md` (this file) |
| Handoff note routine and `docs/notes/handoff.md` template | `skills/session-handoff/SKILL.md` |
| Blocker note routine and `docs/notes/blocker-<topic>.md` template | `skills/blocker-note/SKILL.md` |
| Skill creation threshold, structure, quality rules, iteration and library maintenance | `skills/skill-creator/SKILL.md` |
| Loop anatomy, global stop conditions, retry policy, loop index | `docs/LOOP_ENGINEERING.md` |
| Concrete loop routines | `skills/<name>/SKILL.md` |
| Task status and build order | `docs/TASKS.md` |
| Decision log | `docs/DECISIONS.md` |
| Copy-paste Stitch prompts (keeps inline token values by design) | `docs/STITCH_PROMPTS.md` |
