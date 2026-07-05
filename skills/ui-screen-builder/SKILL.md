# ui-screen-builder

Goal: build or redesign one Expo / React Native screen's UI following the Eazy Review design system.

## When to use

- One screen's visuals, layout, or component composition: `app/(tabs)/feed.tsx`, `app/(tabs)/browse.tsx`, `app/(tabs)/account.tsx`, `app/product/[id].tsx`, `app/product/[id]/rate.tsx`, or the auth/account stack screens.
- Visual improvements to an existing screen without changing what data it uses.

## When not to use

- The work spans data and UI as one `docs/TASKS.md` task: use `skills/feature-slice-builder`.
- The work changes data shapes or mock data: use `skills/product-data-modeling`.

## Inputs expected

- One target screen (route file path).
- The intended visual outcome (a Stitch direction, a `docs/DESIGN.md` section, or a described change).

## Read first

- `docs/DESIGN.md`: Visual System (tokens), Component Rules, and the target screen's section under Screen-Level Rules.
- The target screen's requirements in `docs/USER_FLOWS.md`.

## Routine

1. Name the screen's one focal point and one primary action from `docs/DESIGN.md` Screen-Level Rules (for example Product Detail: sneaker image plus score summary; primary action: rate).
2. Inventory `src/components/ui/*` (`Screen`, `Button`, `Input`, `Card`, `AppText`, `ScoreBadge`, `ProductCard`, `RatingRow`, `LoadingState`, `EmptyState`, `ErrorState`) and reuse before writing new markup.
3. Apply only tokens that exist in the Visual System section of `docs/DESIGN.md`, via the NativeWind theme in `tailwind.config.js`.
4. Keep score displays labeled: `Eazy Score`, `Community Score`, `My Rating` — never a bare `Score:`. Show `No score yet` for null scores.
5. For Product Detail, implement the CTA logic exactly as defined in the Product Detail section under Screen-Level Rules in `docs/DESIGN.md`.
6. Keep loading, empty, and error states working for any data the screen shows.
7. Check the result against the Design Quality Checklist in `docs/DESIGN.md`.
8. Run verification, then the memory step.

## Verification

- `npm run typecheck` and `npm run lint`.
- Visual pass on a 393px-wide viewport (reference width); confirm one focal point, one primary action, thumb-sized touch targets.

## Stop conditions

- The design needs a token not in `docs/DESIGN.md` (new color, radius, spacing): stop; token changes are a design-system decision and must also update `docs/STITCH_PROMPTS.md`.
- The design needs a new reusable component pattern not in the Component Rules: stop and report instead of inventing one screen-locally.

## Memory step

- Update `docs/TASKS.md` if the screen work completes or advances a listed task.
- Add a `docs/DECISIONS.md` entry only if a component or visual-system decision was made.

## Common mistakes

- One-off inline styles instead of `src/components/ui/*` primitives.
- Letting every badge and number compete instead of one focal point.
- Marketplace/discount styling or generic ecommerce layout (see `docs/DESIGN.md` identity).
- Adding comments, likes, or social UI to MVP screens.
- Forgetting `No score yet` when `eazyScore` or `communityScore` is null.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
