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
- **Destructive commands** — the next step would require `rm -rf`, `git reset --hard`, a database drop, mass deletes, or anything on the destructive list in `docs/SECURITY.md`.
- **New design tokens** — the change needs a color, radius, or spacing value not in `docs/DESIGN.md`. Token changes are a design-system decision, not a side effect.
- **Session boundary** — a feature phase is complete, a bug is fixed and the next task is unrelated, backend work is done and UI is next, or exploration is done and implementation is next. Stop adding work; run `skills/session-handoff` and recommend a fresh session (boundary details in `docs/AGENT_WORKFLOW.md`, Session Boundaries And State Persistence).
- **Stalled debugging** — the blocker-note triggers fire (2+ failures on the same problem, 20–30+ minutes without progress, messy context, or plan A → B → A looping). Run `skills/blocker-note` instead of attempting another fix.

Stopping is a success state: report what was found, what was tried, and what decision is needed.

## Retry Policy

Maximum two fix attempts for any single failure.

1. First failure: form a hypothesis, apply the smallest fix, re-verify.
2. Second failure: one more hypothesis and minimal fix, re-verify.
3. Still failing: stop. Report both hypotheses, both attempts, and the current error verbatim. Do not try a third variation, widen the change, or disable the failing check. If the problem will be picked up again (by a fresh session or a human), persist the state with `skills/blocker-note`.

## Subagent Escalation Boundary

Subagents inherit the retry policy above: maximum two fix attempts, then stop. On any stop condition, a subagent does not write handoff or blocker notes itself — it returns a structured report to the parent agent (what was tried, both hypotheses where relevant, the current error verbatim, and the decision needed). The parent decides: retry with more context, escalate to a stronger model tier with a stated justification, or stop and involve the human. The parent — not the subagent — runs `skills/session-handoff` or `skills/blocker-note` when warranted. Delegation mechanics and routing tiers live in `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy. Cost telemetry is not a memory category; the Memory Rule below is unchanged.

## Debugging Principles

These apply to debugging in any loop, from the first failure through a blocker note:

- Write the hypothesis down before editing — one sentence naming the suspected cause.
- No guess-and-fix: every change must test a stated hypothesis, never "try again" without a new one.
- After repeated failures, stop trying variations and re-read the relevant architecture, workflow, or data docs for the affected layer before continuing.

## Memory Rule

Loops record exactly three kinds of memory, nothing else:

- **Task status** → `docs/TASKS.md` (completed work, newly discovered work).
- **Decisions** → `docs/DECISIONS.md`, using its entry template, for meaningful decisions only.
- **Session state** → `docs/notes/handoff.md` (via `skills/session-handoff`) and `docs/notes/blocker-<topic>.md` (via `skills/blocker-note`). These are working state for the next session, not project documentation: chat is the workbench, files are the hard drive.

Outside `docs/notes/`, no scratch files, no notes docs, no status comments in code. If it is not a task status, a decision, or session state, it does not get written down as project memory.

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
| Session boundary reached or session overloaded — persist state, recommend fresh session | `skills/session-handoff` |
| Debugging stalled (2+ failures, 20–30+ min, or looping) — persist state, stop attempts | `skills/blocker-note` |
| Same task pattern explained 3+ times — turn it into a skill, or iterate/maintain an existing one | `skills/skill-creator` |

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
| Work is going fine but a natural boundary or overloaded session is reached | `session-handoff` | `blocker-note` |
| Debugging itself is stuck and attempts are repeating | `blocker-note` (handoff may link to it) | `session-handoff` alone |
| A repeated pattern needs to become or update a skill | `skill-creator` | Editing skill files ad hoc mid-task |

Related boundary: `bugfix-debug-loop` forbids refactoring surrounding code; `refactor-safety-loop` forbids behavior change. If a fix wants to restructure, or a refactor wants to change behavior, that is a scope-growth stop.
