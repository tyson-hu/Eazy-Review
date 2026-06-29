# Eazy Review Decisions

Use this file for decisions that change product direction, architecture, naming, data model, or workflow.

## 2026-06-28: Establish Document-Controlled Workflow

Decision:
- Product and engineering direction live in `docs/BLUEBOOK.md`.
- UI direction lives in `docs/DESIGN.md`.
- Data model lives in `docs/DATA_MODEL.md`.
- Agent behavior lives in `AGENTS.md`.
- Cursor-specific rules live in `.cursor/rules`.

Reason:
- The project needs durable source-of-truth docs so tools follow the product direction instead of inventing it.

## 2026-06-28: Use Eazy Score Naming In UI

Decision:
- UI uses `Eazy Score`, `Community Score`, and `My Rating`.
- Database may keep the internal table name `official_ratings`.

Reason:
- "Official rating" could imply Adidas, StockX, or another official source.

## 2026-06-28: Mock Core Flow Before Supabase

Decision:
- Build Browse, Product Detail, and Rating Form with mock data before connecting Supabase.

Reason:
- The core UX should be validated before backend complexity is added.

## 2026-06-28: Recalculate Community Score Server-Side

Decision:
- Trusted Community Score calculations belong in Supabase trigger/function or equivalent server-side logic.

Reason:
- Client-calculated aggregate scores are not trustworthy for persisted product summaries.

## 2026-06-28: Make Design Principles UI-Specific

Decision:
- `docs/DESIGN_PRINCIPLES.md` is now the UI design brief, not a general product-rule list.
- The visual direction uses a premium sneaker review intelligence system with `#F7F8FA` background, `#FFFFFF` cards, `#2563EB` primary accent, and decision-first screen hierarchy.

Reason:
- The project needs stronger UI guidance for Stitch, Cursor, and implementation so generated screens do not drift into generic sneaker ecommerce layouts.

## 2026-06-28: Require Documentation Updates With Changes

Decision:
- Every meaningful code, configuration, workflow, design, schema, dependency, route, or product change must update affected docs before commit/PR handoff.
- If no documentation update is needed, agents must state that explicitly with a short reason.
- `docs/DOCUMENTATION_POLICY.md` is the source of truth for which docs to update.

Reason:
- Future agents rely on repo docs as source of truth. Keeping docs synchronized prevents stale plans, mismatched implementation order, and repeated rediscovery after commits.

## 2026-06-28: NativeWind v4 And src/ UI Structure

Decision:
- Use NativeWind v4 with Tailwind CSS v3, `global.css`, and Expo Metro/Babel integration.
- Place new reusable UI components under `src/components/ui/` per `docs/API_CONTRACTS.md`.
- Keep the existing `@/*` path alias mapped to the repo root; import new UI via `@/src/components/ui/...`.
- Encode design tokens from `docs/DESIGN.md` in `tailwind.config.js` theme extensions.
- Remove starter Expo tabs (`Tab One`, `Tab Two`) and the demo modal route.

Reason:
- The app shell needs a consistent styling foundation before Browse, Product Detail, and Rating work begin.
- Keeping new feature code under `src/` matches the documented frontend contract without breaking legacy starter imports under root `components/`.
