# Documentation Policy

Documentation is part of the change, not a cleanup task after the change.

Every meaningful code, configuration, workflow, design, schema, dependency, route, or product change must either:
- Update the affected project documents in the same branch before commit/PR handoff.
- Or explicitly state `No documentation update needed` with a short reason in the final response or PR description.

Tiny typo fixes, formatting-only edits, and internal implementation changes with no visible behavior, contract, workflow, or architecture impact may use the no-docs-needed path.

## Pre-Commit Documentation Gate

Before staging or committing, agents must:

1. Review the changed files with `git status --short` and `git diff --name-only`.
2. Identify which docs are affected by the change.
3. Update those docs before committing.
4. Add a `docs/DECISIONS.md` entry for meaningful product, architecture, data, workflow, design-system, dependency, or toolchain decisions.
5. Confirm in the final response or PR body which docs changed, or why no docs changed.

Do not leave docs stale because a change is "obvious from the code." Future agents use the docs as source of truth.

## Document Update Map

Product scope, positioning, MVP boundaries, or success criteria:
- `docs/BLUEBOOK.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`

UI design, visual system, components, screen layouts, or Stitch direction:
- `docs/DESIGN.md`
- `docs/DESIGN_PRINCIPLES.md`
- `docs/STITCH_PROMPTS.md`
- `docs/USER_FLOWS.md`
- `docs/DECISIONS.md`

Navigation, routes, user flows, auth gates, or screen behavior:
- `docs/USER_FLOWS.md`
- `docs/TASKS.md`
- `docs/BLUEBOOK.md` when scope changes
- `docs/DECISIONS.md` for meaningful flow decisions

Data model, Supabase, auth, RLS, storage, triggers, or migrations:
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`

Frontend API shape, query hooks, mutation hooks, types, mock data, or folder structure:
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/DATA_MODEL.md` when database contracts change
- `docs/DECISIONS.md` for meaningful contract decisions

Tooling, scripts, dependencies, quality checks, local setup, or developer workflow:
- `README.md`
- `AGENTS.md`
- `docs/TASKS.md`
- `docs/MCP_WORKFLOW.md` when agent/tool workflow changes
- `docs/RELEASE_CHECKLIST.md` when release validation changes
- `docs/DECISIONS.md` for meaningful workflow or dependency decisions

Agent behavior, Cursor rules, MCP setup, or AI workflow:
- `AGENTS.md`
- `.cursor/rules/*`
- `docs/MCP_WORKFLOW.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/DECISIONS.md`

Release readiness, QA criteria, security checks, or store-readiness work:
- `docs/RELEASE_CHECKLIST.md`
- `docs/TASKS.md`
- `README.md` when setup or release instructions change
- `docs/DECISIONS.md` for meaningful release-process decisions

## Commit And PR Expectations

Every commit should keep documents and implementation synchronized as much as practical. If a task needs multiple commits, docs may be updated in the final commit of that task, but they must be current before pushing or opening/merging a PR.

Every PR body should include:
- What changed.
- Why it changed.
- Validation run.
- Docs updated, or `No documentation update needed` with a reason.

## Task Completion Checklist

Before final response:
- Relevant docs are updated.
- `docs/TASKS.md` reflects completed or newly discovered work.
- `docs/DECISIONS.md` has entries for meaningful decisions.
- `README.md` reflects setup/check changes when needed.
- Validation commands were run, or skipped with a reason.
