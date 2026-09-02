# MCP Workflow

## Tool Roles

```txt
BLUEBOOK.md = master product/engineering plan
DESIGN.md = sole product UI authority (principles, tokens, typography, elevation, components, screens)
AGENTS.md = how AI agents should work in the repo (all tools)
.cursor/rules = Cursor-attached mirrors of docs/ rules and guardrails
MCP = external tools a coding agent can call
Stitch = fast UI exploration tool
Coding agent (Cursor, Codex, Claude Code, ...) = implementation workspace
```

Main rule: documents control tools, not the other way around. Stitch and coding agents should follow the docs, not randomly decide product direction.

## Document Hierarchy

```txt
BLUEBOOK.md
  -> DESIGN.md + DATA_MODEL.md + USER_FLOWS.md
  -> STITCH_PROMPTS.md
  -> AGENTS.md + .cursor/rules/*
  -> agent implementation tasks
```

## Recommended Workflow

1. Define product direction in `docs/BLUEBOOK.md`.
2. Define product UI/UX and visual system in `docs/DESIGN.md`.
3. Generate visual ideas in Stitch when useful.
4. Save strong Stitch prompts/results in `docs/STITCH_PROMPTS.md`.
5. Ask the coding agent to implement one screen or feature.
6. Use MCP only when external context/tooling is needed.
7. Update affected docs before commit/PR handoff using `docs/DOCUMENTATION_POLICY.md`.

Do not start an agent coding directly on large features. Start with documents, then design, then implementation.

## MCP Setup Philosophy

MCP setup is optional and user-local unless a future task explicitly adopts a
project-wide server dependency. The committed Cursor config is currently an
empty server registry (`.cursor/mcp.json`), and no root `.mcp.json` exists.
Codex MCP configuration remains user-global. Do not add credentials, tokens,
project references, or placeholder server entries merely to make these files
look populated.

Keep MCP configs small; add tools only for a real workflow need. If a future
task deliberately makes a server a shared project dependency, configure each
agent surface in use without committing credentials:

- Cursor: `.cursor/mcp.json`
- Claude Code: `.mcp.json` at the repo root (currently absent)
- Codex: its global `config.toml` (not a repo file)

Recommended starting tools:
- Stitch MCP: visual exploration.
- Supabase MCP: inspect schema, queries, local dev DB.
- GitHub MCP: issues, PRs, and repo context.

Add later only when needed:
- Figma MCP.
- Docs/Drive/Notion MCP.

**Browser / Playwright MCP** — use for Expo web mobile preview and scripted UX evidence when available. Follow `skills/interactive-preview-loop` and `docs/WEB_MOBILE_PREVIEW_SOP.md` (reference mobile-web viewport default 393×852, dialog/session rules, screenshot naming under `docs/evidence/`). Do not add Playwright as a repo dependency for ad-hoc audits. Classify actions per MCP Tool Policy below; prefer built-in navigate/click/type/screenshot/snapshot over `browser_run_code_unsafe`.

Treat each MCP server as a capability boundary, especially if it can write to a database, repo, or external service.

## MCP Tool Policy

Classify every MCP action — and every external-tool write made through a CLI such as `gh` — before calling it, and behave per its level. `.cursor/rules/mcp-policy.mdc` mirrors this section for Cursor's always-apply mechanism; this section is the home, the rule is the mirror.

- **READ** — may run without approval. Examples: inspect a local/approved
  staging schema, search files, read PRs.
- **REVERSIBLE WRITE** — state the target and intended change before executing. Examples: create a branch, update a draft, modify a **local or approved staging** development record.
- **HIGH IMPACT** — explicit user approval required. Examples: application or
  service deploy,
  non-account deletion outside a production database, credential changes
  outside a production database, force push, destructive migration on
  local/approved staging, mass update on local/approved staging.
- **FORBIDDEN** — never perform, even with approval in chat. Examples:
  **account deletion** on any environment (local, staging, or production);
  production database reads (including schema inspection), writes, drops,
  deletes, migrations, or credentials. Production databases are unavailable to
  coding agents and MCP tools (`docs/SECURITY.md`).

Standing principles at every level:

- Read before write.
- Use the narrowest tool available; never substitute a broader tool when a narrower one exists.
- Never silently switch from a development target to a production target.
- Never treat any production database read, write, drop, delete, migration, or
  credential operation as HIGH IMPACT that can be approved — it is FORBIDDEN.
- Agents may implement and non-destructively validate the protected account
  deletion flow and prepare a checklist, but an actual deletion must be
  initiated and executed manually by a human, never through an
  agent-controlled browser, MCP, SQL, or admin tool.
- Never treat agent-executed account deletion as HIGH IMPACT that can be
  approved — it is FORBIDDEN on every environment.
- Never expose credential values (`docs/SECURITY.md`).

### GitHub Project #4 via `gh`

The board's role, status mapping, and sync timing live in
`docs/DOCUMENTATION_POLICY.md`, GitHub Project #4 Mirror. This subsection only
classifies the calls. Project number `4`, owner `tyson-hu`; resolve project,
field, option, and item IDs at call time from the READ commands — do not store
them in the repo.

- **READ:** `gh project view 4 --owner tyson-hu --format json`,
  `gh project field-list 4 --owner tyson-hu --format json`,
  `gh project item-list 4 --owner tyson-hu --format json --limit 100`.
- **REVERSIBLE WRITE** (state `ID/title: from → to` before each call; only
  items the human authorized from the PR body's `Project #4 moves:` line):
  `gh project item-edit --project-id <project> --id <item> --field-id <Status
  field> --single-select-option-id <option>`; `gh project item-create` for one
  stated new ledger item with its Lane and ID; `gh project item-archive` for
  one stated item; a one-time `gh project edit 4 --readme` pointer change.
- **HIGH IMPACT:** any bulk loop or more items than the PR body lists; Status,
  Lane, or other field/option schema changes; project close; any move to
  `Completed` not backed by recorded human acceptance in `docs/TASKS.md`.
- **FORBIDDEN:** `gh project item-delete`, `gh project delete`.

Stop and report instead of retrying when an `ID` matches anything other than
exactly one item, the target is not one of the board's `Status` options, a
`Completed` move lacks ledger acceptance, or any call errors.

## Agent Security Baseline

All agent and MCP tool work follows `docs/SECURITY.md` (the canonical security rules for setup, shell, destructive commands, and secrets).

## Stitch Usage

Use Stitch for visual exploration, not final authority.

Good workflow:
1. Read `docs/DESIGN.md` and `docs/STITCH_PROMPTS.md`.
2. Prompt with product context, exact screens, components, visual system, constraints, and platform.
3. Generate 2-4 related screens at a time instead of the whole app.
4. Ask for one or two targeted refinements per prompt.
5. Apply one final consistency prompt across selected screens.
6. Save the chosen direction in `docs/DESIGN.md`; update
   `docs/STITCH_PROMPTS.md` only when reusable prompt text changes.
7. Ask the coding agent to implement the selected direction.

Use specific UI terms in prompts:
- score badge
- rating category row
- price-size pill
- horizontal category chips
- segmented control
- bottom sheet
- sticky CTA
- bottom tab navigation
- product image carousel

## Agent Task Format

Scope agent requests to one task at a time using the skills in `skills/` (indexed in `docs/LOOP_ENGINEERING.md`). Each skill defines its inputs, routine, verification, and doc-update step. Avoid asking any agent to "build the whole app" in one request.
