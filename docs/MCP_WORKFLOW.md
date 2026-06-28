# MCP Workflow

## Tool Roles

```txt
BLUEBOOK.md = master product/engineering plan
DESIGN.md = design principles and UI/UX source of truth
AGENTS.md = how AI agents should work in the repo
.cursor/rules = Cursor-specific scoped rules
MCP = external tools Cursor can call
Stitch = fast UI exploration tool
Cursor = implementation workspace
```

Main rule: documents control tools, not the other way around. Stitch and Cursor should follow the docs, not randomly decide product direction.

## Document Hierarchy

```txt
BLUEBOOK.md
  -> DESIGN.md + DATA_MODEL.md + USER_FLOWS.md
  -> STITCH_PROMPTS.md
  -> AGENTS.md + .cursor/rules/*
  -> Cursor implementation tasks
```

## Recommended Workflow

1. Define product direction in `docs/BLUEBOOK.md`.
2. Define design principles in `docs/DESIGN.md`.
3. Generate visual ideas in Stitch when useful.
4. Save strong Stitch prompts/results in `docs/STITCH_PROMPTS.md`.
5. Ask Cursor to implement one screen or feature.
6. Use MCP only when external context/tooling is needed.
7. Update docs after important decisions.

Do not start with Cursor coding directly for large features. Start with documents, then design, then implementation.

## MCP Setup Philosophy

Keep `.cursor/mcp.json` small. Add tools based on real workflow needs.

Recommended starting tools:
- Stitch MCP: visual exploration.
- Supabase MCP: inspect schema, queries, local dev DB.
- GitHub MCP: issues, PRs, and repo context.

Add later only when needed:
- Figma MCP.
- Browser/Playwright MCP.
- Docs/Drive/Notion MCP.

Treat each MCP server as a capability boundary, especially if it can write to a database, repo, or external service.

## Stitch Usage

Use Stitch for visual exploration, not final authority.

Good workflow:
1. Read `docs/DESIGN_PRINCIPLES.md` and `docs/STITCH_PROMPTS.md`.
2. Prompt with product context, exact screens, components, visual system, constraints, and platform.
3. Generate 2-4 related screens at a time instead of the whole app.
4. Ask for one or two targeted refinements per prompt.
5. Apply one final consistency prompt across selected screens.
6. Save the chosen direction in `docs/DESIGN.md` or `docs/STITCH_PROMPTS.md`.
7. Ask Cursor to implement the selected direction.

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

## Cursor Task Packet Format

Use controlled task packets:

```txt
Task:

Read:

Scope:

Out of scope:

Expected output:

Quality check:
```

Avoid asking Cursor or an agent to "build the whole app" in one request.
