---
id: decision-separate-style-language-from-product-ux
date: 2026-07-19
updated: 2026-07-30
status: superseded
superseded_by: decision-make-design-the-only-app-ui-authority
area: product-ux
tasks: []
pr: null
tags: [design, ui-style, visual-system]
supersedes: []
---

# Separate visual style language from product UX rules

## Context

General visual references and Eazy Review's product-specific hierarchy,
components, and screen jobs had become mixed, creating competing sources for
tokens and layout decisions.

## Decision

`docs/UI_STYLE.md` describes the visual style language. `docs/DESIGN.md`
remains the product UI/UX authority and owns the app-canonical Visual System,
component rules, and screen rules. Product jobs outrank generic style examples.

## Consequences

- Screen UI work reads both documents for different purposes.
- Token changes update the app Visual System and its configured consumers.
- Generic marketing layouts do not override decision-first product hierarchy.

## Revisit when

The style language and product rules can be merged without duplicating tokens,
weakening ownership, or increasing per-task context.

## Related

- `docs/UI_STYLE.md`
- `docs/DESIGN.md`
- `docs/STITCH_PROMPTS.md`
- `.cursor/rules/design-system.mdc`
