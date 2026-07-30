---
id: decision-make-design-the-only-app-ui-authority
date: 2026-07-30
status: accepted
area: product-ux
tasks: []
pr: null
tags: [design, documentation, visual-system]
supersedes: [decision-separate-style-language-from-product-ux]
---

# Make DESIGN the only app UI authority

## Context

The separate Apple website style analysis described marketing layouts, desktop
breakpoints, black navigation, dark tiles, and 80px section rhythm that the
mobile product rules explicitly rejected. Requiring both documents on every UI
task created competing guidance and unnecessary synchronization.

## Decision

`docs/DESIGN.md` is the sole Eazy Review product UI source of truth. It owns the
app token table, typography, elevation, components, principles, and screen
rules; `tailwind.config.js` remains the configured token consumer and
`docs/STITCH_PROMPTS.md` changes only when reusable prompt values change. The
Apple analysis is retained under `docs/research/` as non-authoritative
research, while `docs/UI_STYLE.md` remains only as a migration pointer for
historical links.

## Consequences

- UI tasks read one canonical product design document.
- Marketing research cannot override mobile product requirements.
- Research history remains available without becoming implementation policy.
- Token changes update only their real consumers and any deliberately
  duplicated prompt values.

## Revisit when

The product deliberately adopts a second maintained design authority with a
clear non-overlapping ownership model.

## Related

- `docs/DESIGN.md`
- `docs/UI_STYLE.md`
- `docs/research/apple-visual-analysis.md`
- `tailwind.config.js`
