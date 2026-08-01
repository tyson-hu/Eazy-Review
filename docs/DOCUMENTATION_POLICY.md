# Documentation Policy

Documentation is part of the change, not a cleanup task after the change.

Every meaningful code, configuration, workflow, design, schema, dependency, route, or product change must either:
- Update the affected project documents in the same branch before commit/PR handoff.
- Or explicitly state `No documentation update needed` with a short reason in the final response or PR description.

Tiny typo fixes, formatting-only edits, and internal implementation changes with no visible behavior, contract, workflow, or architecture impact may use the no-docs-needed path.

## Machine-Readable Enforcement

This prose explains the policy. `config/agent-infrastructure.json` is the
machine-readable enforcement source for document lifecycle, ownership,
source-to-mirror relationships, generated-command ownership, dependency
edges, stale-term rules, changed-path impact rules, and the strict Task 13–29
metadata contract.

Document registry entries declare whether they are files or directories, and
the checker rejects kind substitutions as well as missing paths. Entries are
required to exist by default. Only intentionally transient status documents
under `docs/notes/` may set `requiredOnDisk: false`, so the graph can retain
their lifecycle and ownership metadata without making a clean CI checkout
manufacture session state.

An active directory registration covers its current text descendants for
stale-term validation. Traversal excludes any nested path separately registered
as historical, so current ADR files remain active while
`docs/decisions/archive/**` remains point-in-time history.

- `npm run check:agent-infra` validates that contract without writing files.
- `node scripts/check-agent-infrastructure.cjs --report <changed-path>...`
  prints which documents require review for the supplied paths, including
  dependency, bidirectional source/mirror, and generated-artifact propagation.
  Report mode validates the manifest structure but remains available while
  active-document drift is being repaired; `npm run check:agent-infra`
  enforces the complete current-repository contract.

The checker catches structural drift; it does not decide whether prose is
semantically correct, whether an ADR is warranted, or whether a listed
document actually needs a content change. Parent and independent reviewer
judgment remain required. When the report and this prose differ, stop and
correct the config or policy together rather than silently choosing one.

## Pre-Commit Documentation Gate

Before staging or committing, agents must:

1. Review the changed files with `git status --short` and `git diff --name-only`.
2. Identify which docs are affected by the change.
3. Update those docs before committing.
4. If the change introduces or changes a durable high-impact decision, add or update one ADR-style record under `docs/decisions/` using `docs/decisions/README.md`, then run `npm run decisions:build`.
5. Confirm in the final response or PR body which docs changed, or why no docs changed.

Do not leave docs stale because a change is "obvious from the code." Future agents use the docs as source of truth.

Do not record routine bug fixes, review-finding closure, task progress,
validation runs, patch alignment, or documentation synchronization as
decisions. `docs/DECISIONS.md` is generated and must not be edited directly;
`npm run decisions:check` validates the records and index.

## Document Update Map

Product scope, positioning, MVP boundaries, or success criteria:
- `docs/BLUEBOOK.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`
- `docs/decisions/*.md` only for a qualifying durable product decision

UI design, visual system, components, screen layouts, or Stitch direction:
- `docs/DESIGN.md` (sole product UI source of truth)
- `tailwind.config.js` when configured token values change
- `docs/STITCH_PROMPTS.md` only when reusable prompt copy or its deliberately
  inlined token values change
- `docs/USER_FLOWS.md` only when navigation or screen behavior changes
- `docs/decisions/*.md` only for a qualifying durable design-system decision

`docs/research/*` is historical/non-authoritative and is not a routine
implementation sync target. `docs/UI_STYLE.md` is a migration pointer only.

Navigation, routes, user flows, auth gates, or screen behavior:
- `docs/USER_FLOWS.md`
- `docs/TASKS.md`
- `docs/BLUEBOOK.md` when scope changes
- `docs/decisions/*.md` only for a qualifying durable flow decision

Data model, Supabase, auth, RLS, storage, triggers, or migrations:
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/decisions/*.md` only for a qualifying durable data, auth, or security decision

Frontend API shape, query hooks, mutation hooks, types, mock data, or folder structure:
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/DATA_MODEL.md` when database contracts change
- `docs/decisions/*.md` only for a qualifying durable contract decision

Tooling, scripts, dependencies, quality checks, local setup, or developer workflow:
- `README.md`
- `AGENTS.md`
- `docs/TASKS.md`
- `docs/MCP_WORKFLOW.md` when agent/tool workflow changes
- `docs/RELEASE_CHECKLIST.md` when release validation changes
- `docs/decisions/*.md` only for a qualifying durable workflow, tooling, or dependency decision

Agent behavior, Cursor rules, MCP setup, or AI workflow:
- `AGENTS.md`
- `.cursor/rules/*`
- `.cursor/agents/*` (subagent definitions; keep aligned with the Delegation And Subagent Policy in `docs/AGENT_WORKFLOW.md` and the rollout status in `docs/TASKS.md`)
- `docs/SECURITY.md` when security rules change (keep `.cursor/rules/security.mdc` mirrored)
- `docs/AGENT_WORKFLOW.md`
- `docs/LOOP_ENGINEERING.md`
- `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`, `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md`, `docs/evidence/README.md`, and `skills/interactive-preview-loop` when interactive preview, UX audit, or evidence upload procedure changes
- `skills/*/SKILL.md` (canonical skill bodies) and the generated discovery
  wrappers in `.claude/skills/*` and `.agents/skills/*`. The two wrapper trees
  are byte-for-byte identical to each other; each wrapper points to its
  canonical skill and intentionally does not copy the canonical body.
- `docs/MCP_WORKFLOW.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/decisions/*.md` only for a qualifying durable agent-workflow decision

Release readiness, QA criteria, security checks, or store-readiness work:
- `docs/RELEASE_CHECKLIST.md`
- `docs/TASKS.md`
- `README.md` when setup or release instructions change
- `docs/decisions/*.md` only for a qualifying durable release-process decision

## Commit And PR Expectations

Every commit should keep documents and implementation synchronized as much as practical. If a task needs multiple commits, docs may be updated in the final commit of that task, but they must be current before pushing or opening/merging a PR.

PR bodies use the PR summary template in `docs/AGENT_WORKFLOW.md`, and every task ends against the Definition Of Done there.
