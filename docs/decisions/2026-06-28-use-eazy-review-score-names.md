---
id: decision-use-eazy-review-score-names
date: 2026-06-28
status: accepted
area: product-ux
tasks: [8, 9, 10, 14, 16]
pr: null
tags: [eazy-score, my-rating, terminology]
supersedes: []
---

# Use Eazy Review score names in the UI

## Context

Generic or source-oriented labels can make a score appear to come from a
retailer, brand, or other official source. The product needs distinct names for
its editorial score, community aggregate, and the viewer's own rating.

## Decision

User-facing surfaces use `Eazy Score`, `Community Score`, and `My Rating`
exactly. Internal schema and adapter names may differ, but those names must be
mapped at the product boundary rather than leaked into UI copy.

## Consequences

- Product, design, flow, and accessibility copy must preserve the three names.
- Database naming can evolve without changing the user-facing vocabulary.
- New score labels require an explicit product decision.

## Revisit when

The product changes who authors a score or introduces a genuinely different
score type that cannot be represented by the existing vocabulary.

## Related

- `AGENTS.md`
- `docs/BLUEBOOK.md`
- `docs/DESIGN.md`
- `docs/API_CONTRACTS.md`
