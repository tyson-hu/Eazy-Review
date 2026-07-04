# Loop Engineering

This file defines the shared machinery for all working loops in this repo: what a loop is made of, when every loop must stop, how retries work, and what counts as memory. The concrete loops live in `skills/<name>/SKILL.md` — skills are the loop instances. This file never restates a skill's routine, and skills never restate the global rules here. Session flow, context map, and handoff formats live in `docs/AGENT_WORKFLOW.md`.

## Loop Anatomy

Every loop has eight parts:

1. **Trigger** — the situation that selects this loop (see the loop index below).
2. **Goal** — the single outcome the loop produces; one loop, one goal.
3. **Required context** — the exact docs and sections to read first, per the context map in `docs/AGENT_WORKFLOW.md`.
4. **Routine** — the ordered steps of the loop, defined only in the skill.
5. **Verification** — how the loop proves the goal was reached, using the narrowest validation command that covers the change.
6. **Stop conditions** — the global list below, plus skill-specific stops defined in the skill.
7. **Memory** — what the loop records before ending (memory rule below).
8. **Handoff** — the Human-readable handoff from `docs/AGENT_WORKFLOW.md`, always.

## Global Stop Conditions

Stop the loop, report, and wait for a human decision when any of these occur:

- **Scope growth** — the work starts touching files, routes, schema, or features outside the task that triggered the loop.
- **Two failed fix attempts** — see the retry policy below.
- **Conflict with `docs/BLUEBOOK.md` or `docs/DATA_MODEL.md`** — the change would contradict product direction or the documented schema.
- **Missing credentials** — the loop needs a key, token, or environment value that is not available. Never invent or hardcode one.
- **Destructive commands** — the next step would require `rm -rf`, `git reset --hard`, a database drop, mass deletes, or anything on the destructive list in `.cursor/rules/security.mdc`.
- **New design tokens** — the change needs a color, radius, or spacing value not in `docs/DESIGN.md`. Token changes are a design-system decision, not a side effect.

Stopping is a success state: report what was found, what was tried, and what decision is needed.

## Retry Policy

Maximum two fix attempts for any single failure.

1. First failure: form a hypothesis, apply the smallest fix, re-verify.
2. Second failure: one more hypothesis and minimal fix, re-verify.
3. Still failing: stop. Report both hypotheses, both attempts, and the current error verbatim. Do not try a third variation, widen the change, or disable the failing check.

## Memory Rule

Loops record exactly two kinds of memory, nothing else:

- **Task status** → `docs/TASKS.md` (completed work, newly discovered work).
- **Decisions** → `docs/DECISIONS.md`, using its entry template, for meaningful decisions only.

No scratch files, no notes docs, no status comments in code. If it is not a task status or a decision, it does not get written down as project memory.

## Loop Index

| Trigger | Skill |
| --- | --- |
| Implement one user-visible feature from `docs/TASKS.md` (data + UI) | `skills/feature-slice-builder` |
| Build or redesign one Expo / React Native screen's UI | `skills/ui-screen-builder` |
| Change database schema, RLS, migrations, or rating-summary logic | `skills/supabase-schema-change` |
| Change frontend product/rating data shape, types, or mock data | `skills/product-data-modeling` |
| Fix a reported bug in existing behavior | `skills/bugfix-debug-loop` |
| Restructure code without changing behavior | `skills/refactor-safety-loop` |
| Bring drifted docs back in sync with code | `skills/docs-sync-loop` |
| Run and interpret project checks for a finished change | `skills/test-and-validation-loop` |

## Disambiguation

When two loops seem to apply, use these precedence rules. Each pair is also cross-referenced in the skills' "When not to use" sections.

| Situation | Use | Not |
| --- | --- | --- |
| `docs/TASKS.md` feature spanning data + UI | `feature-slice-builder` | `ui-screen-builder` |
| Purely one screen's visuals or layout | `ui-screen-builder` | `feature-slice-builder` |
| Any change needing SQL, a migration, or RLS (includes syncing frontend types) | `supabase-schema-change` | `product-data-modeling` |
| Frontend-only shape, type, mock, or display change | `product-data-modeling` | `supabase-schema-change` |
| Validation failure caused by the current change | Fix inside `test-and-validation-loop` (max 2 tries) | `bugfix-debug-loop` |
| Pre-existing bug found during validation | Record in `docs/TASKS.md`; fix later via `bugfix-debug-loop` | Fixing it inside the current loop |
| Doc updates for the change you just made | The skill's own memory step | `docs-sync-loop` |
| Standalone, after-the-fact doc drift | `docs-sync-loop` | Per-skill memory steps |

Related boundary: `bugfix-debug-loop` forbids refactoring surrounding code; `refactor-safety-loop` forbids behavior change. If a fix wants to restructure, or a refactor wants to change behavior, that is a scope-growth stop.
