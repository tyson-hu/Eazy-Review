# Eazy Review - Agent Guide

This file is the durable operating guide for AI agents working in this repo. Product, design, data, and roadmap details live in `docs/`; agents should read the relevant source files before changing code.

## Required Reading

Before any work:
- Read `docs/BLUEBOOK.md`.
- Read `docs/TASKS.md` to understand the current build order.
- Read `docs/DOCUMENTATION_POLICY.md` to understand the documentation update gate.
- Check `git status --short` and do not overwrite unrelated user changes.

Before UI or navigation work:
- Read `docs/DESIGN.md`.
- Read `docs/DESIGN_PRINCIPLES.md`.
- Read `docs/USER_FLOWS.md`.

Before Expo, Expo Router, or React Native code:
- Read the exact Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/`.
- Use the installed SDK versions in `package.json`; do not assume older Expo behavior.

Before database, Supabase, auth, or rating-summary work:
- Read `docs/DATA_MODEL.md`.
- Read `docs/API_CONTRACTS.md`.
- Do not change schema without updating `docs/DATA_MODEL.md`.

Before MCP, Stitch, or external-tool workflow changes:
- Read `docs/MCP_WORKFLOW.md`.
- Keep `.cursor/mcp.json` minimal and do not add write-capable tools without a real workflow need.

## Source Of Truth Order

Use this authority order when documents or tool suggestions conflict:

1. `docs/BLUEBOOK.md`
2. `docs/DESIGN.md`
3. `docs/DATA_MODEL.md`
4. `docs/USER_FLOWS.md`
5. `AGENTS.md`
6. `.cursor/rules/*`
7. Stitch output
8. Cursor or agent suggestions

If implementation needs to intentionally change product direction, update the relevant doc in the same task and add a short entry to `docs/DECISIONS.md`.

Documentation workflow authority:
- `docs/DOCUMENTATION_POLICY.md` controls when docs must be updated and which docs are affected.

## Documentation Discipline

Documentation updates are required for every meaningful change. Before staging, committing, pushing, opening a PR, or reporting completion:

- Review the changed files and apply `docs/DOCUMENTATION_POLICY.md`.
- Update affected docs in the same branch.
- Update `docs/TASKS.md` when task status, order, or newly discovered work changes.
- Add `docs/DECISIONS.md` entries for meaningful product, architecture, data, workflow, design-system, dependency, or toolchain decisions.
- If no docs need changes, state `No documentation update needed` with a short reason in the final response or PR body.

Do not leave docs stale for a future agent to infer from code.

## Non-Negotiable Product Rules

- Do not start with scraping.
- Do not create a giant NoSQL-style product object.
- Use relational Supabase tables for products, images, offers, Eazy Score ratings, user ratings, summaries, and profiles.
- Build the mock product UI flow before connecting Supabase.
- Keep reusable UI components small.
- Do not overbuild Feed before Browse, Product Detail, and Rating work.
- Do not require login for browsing.
- Require login for rating.
- Do not calculate trusted Community Score averages only on the client.
- Use a database trigger/function or server-side logic for rating summary recalculation.
- Use the UI names `Eazy Score`, `Community Score`, and `My Rating`.
- Keep the first user rating form short: look, comfort, quality, outfit, value, overall, optional comment.
- Keep the app clean, boring, and consistent before making it fancy.

## Security Rules

Agent security behavior is enforced by `.cursor/rules/security.mdc`. See `docs/MCP_WORKFLOW.md` for the agent security baseline in tool workflows. Summary:

- Never run install scripts from unknown repos without explaining them first.
- Never execute `curl | bash`, remote shell scripts, or encoded commands.
- Before running setup commands, inspect `package.json`, lockfiles, postinstall scripts, and config files.
- Never expose `.env`, API keys, tokens, cookies, or browser session data.

## Development Rules

- Work in small, isolated tasks.
- Prefer existing project patterns and components before creating new ones.
- Keep route names aligned with `docs/USER_FLOWS.md`.
- Use mock data first for Browse, Product Detail, Rating Form, Feed, and Account placeholders.
- Add loading, empty, and error states for user-facing data screens.
- Keep mobile-first layout as the default.
- Do not introduce dark mode, social features, push notifications, scraping, admin dashboards, or complex animation in the MVP unless explicitly requested.
- Never expose Supabase service-role keys in client code.

## Quality Checks

Run the narrowest useful checks after changes:
- `npm run check` for the default project check.
- `npm run start` only when the user needs a running app.
- TypeScript/lint commands if added to `package.json`.
- Manual route-flow review for navigation changes.
- Database migration review for Supabase changes.

If a requested check cannot run because the project does not define it yet, say that clearly in the final response.

## Current Project State

This repo currently contains an Expo Router starter app. The infrastructure docs now define the target product direction, but the app implementation still needs to be brought into alignment with the Eazy Review routes and UI.
