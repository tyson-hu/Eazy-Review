# MCP Workflow

## Tool Roles

```txt
BLUEBOOK.md = master product/engineering plan
DESIGN.md = design principles and UI/UX source of truth
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
2. Define design principles in `docs/DESIGN.md`.
3. Generate visual ideas in Stitch when useful.
4. Save strong Stitch prompts/results in `docs/STITCH_PROMPTS.md`.
5. Ask the coding agent to implement one screen or feature.
6. Use MCP only when external context/tooling is needed.
7. Update affected docs before commit/PR handoff using `docs/DOCUMENTATION_POLICY.md`.

Do not start an agent coding directly on large features. Start with documents, then design, then implementation.

## MCP Setup Philosophy

Keep MCP configs small; add tools based on real workflow needs. Each agent reads its own config, so a server the project relies on must be added to every config in use:

- Cursor: `.cursor/mcp.json`
- Claude Code: `.mcp.json` at the repo root
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

Classify every MCP action before calling it, and behave per its level. `.cursor/rules/mcp-policy.mdc` mirrors this section for Cursor's always-apply mechanism; this section is the home, the rule is the mirror.

- **READ** — may run without approval. Examples: inspect schema, search files, read PRs.
- **REVERSIBLE WRITE** — state the target and intended change before executing. Examples: create a branch, update a draft, modify a development record.
- **HIGH IMPACT** — explicit user approval required. Examples: deploy, delete, production database write, credential change, force push, destructive migration, mass update.

Standing principles at every level:

- Read before write.
- Use the narrowest tool available; never substitute a broader tool when a narrower one exists.
- Never silently switch from a development target to a production target.
- Never expose credential values (`docs/SECURITY.md`).

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
6. Save the chosen direction in `docs/DESIGN.md` or `docs/STITCH_PROMPTS.md`.
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
