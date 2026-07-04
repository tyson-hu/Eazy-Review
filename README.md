# Eazy Review

Eazy Review is a mobile-first product review and discovery app focused on sneakers and products. The core loop is simple: browse products, open a product detail page, compare Eazy Score with Community Score, submit or edit My Rating, and find rated products later.

The repo currently starts from an Expo Router app shell. The project infrastructure docs define the intended architecture and implementation order.

## Documentation Map

- `docs/BLUEBOOK.md`: master product and engineering plan.
- `docs/DESIGN.md`: UI/UX source of truth (identity, principles, tokens, component and screen rules).
- `docs/DOCUMENTATION_POLICY.md`: required doc-update rules for future changes.
- `docs/AGENT_WORKFLOW.md`: agent session flow, context map, definition of done, handoff and PR formats.
- `docs/LOOP_ENGINEERING.md`: loop anatomy, stop conditions, retry policy, and the loop-to-skill index.
- `docs/USER_FLOWS.md`: core user journeys and route expectations.
- `docs/DATA_MODEL.md`: Supabase schema, RLS, triggers, and rating summary logic.
- `docs/API_CONTRACTS.md`: frontend types, API functions, and query keys.
- `docs/ROADMAP.md`: milestone plan.
- `docs/TASKS.md`: current implementation task order.
- `docs/MCP_WORKFLOW.md`: Cursor, Stitch, and MCP workflow rules.
- `docs/STITCH_PROMPTS.md`: reusable UI exploration prompts.
- `docs/DECISIONS.md`: project decision log.
- `docs/RELEASE_CHECKLIST.md`: release-readiness checklist.

## Stack Direction

- Expo SDK 57
- Expo Router
- React Native
- TypeScript
- NativeWind
- Supabase
- TanStack Query

Before writing Expo code, read the exact SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/`.

## Quality Checks

Validation commands and when to use each live in `docs/AGENT_WORKFLOW.md` (Validation Commands). For CI or local web-bundle verification: `CI=1 npx expo export --platform web`.

## Documentation Discipline

Doc-update rules live in `docs/DOCUMENTATION_POLICY.md`; apply them before commit/PR handoff.

## First Build Goal

The first successful version should let a user browse mock products, open a product detail page, understand Eazy Score and Community Score, submit a local My Rating, and review the full UX flow before Supabase is added.
