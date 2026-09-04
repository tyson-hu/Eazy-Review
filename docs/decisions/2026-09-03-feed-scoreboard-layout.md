---
id: decision-feed-scoreboard-layout
date: 2026-09-03
status: accepted
area: product-ux
tasks: [21]
pr: 52
tags: [design-system, discovery, feed]
supersedes: []
---

# Lay out Feed as a spotlight plus ranked rows, not a second Browse list

## Context

The first Task 21 Feed reused the Browse `ProductCard` under three section
titles. Browse is a search bar over a stack of full product cards, so the Feed
became the same stack without the search bar: the human reviewing PR #52 could
not tell the tabs apart. The Feed's job is discovery framed around the app's
core signal (Eazy Score, Community Score, and later shared community reviews),
and it must stay honest about why any product appears. Card-versus-list
guidance says cards suit browsing, while ordered lists suit rankings and
scanning many items, and that carousels hide critical information.

## Decision

Feed is a scoreboard, not a card stack. Every section renders a title plus a
one-line basis caption stating how it is ordered. The lead product of the
first populated section renders as one `ProductSpotlightCard` (editorial image,
identity, one large Eazy Score, compact Community proof, offer line, and a
`View product` affordance). Every other product renders as a
`ProductRankRow` inside one bordered list: optional rank number, thumbnail,
brand and name, and one labeled composite score. Newly Added rows are
unnumbered because recency is not a rank; Best Eazy Scores and Most Rated rows
are numbered. Newly Added and Best Eazy Scores rows show Eazy Score; Most Rated
rows show Community Score with the rating count. The Browse `ProductCard`
remains the Browse and Rated Products card and is never stacked on Feed.
Section selection, the min-two ranked threshold, the five-item cap, and the
duplicate-hide rule from the 2026-09-02 decision are unchanged; the helper
adds view-only `caption`, `leadLabel`, `signal`, and `ranked` fields. The
future community slot is a `Latest community reviews` section of Review Cards
between the spotlight and the ranked sections; it is documented, not rendered,
until community text is in scope. `AppText` gains a `score` variant (36px,
weight 600, caller-supplied tone color) and an `action` variant (inline accent
affordance) because generated class CSS is name-ordered and a trailing class
cannot reliably override a variant's size or color on web.

## Consequences

- Feed and Browse are visibly different at the 393px reference width while
  sharing the catalog query, tokens, and score semantics.
- Every score on Feed stays labeled (`Eazy Score` / `Community Score`) and
  every section states its ordering basis, preserving the trust rule.
- Rows drop SKU, price, and the second score; Product Detail remains the place
  to compare both scores and offers.
- Adding the community review section later is a documented insertion point,
  not a layout change.
- Long sneaker names may take three lines in a row; row height is
  content-driven.

## Revisit when

Community written reviews enter scope (the review section becomes real), a
measured Task 20 trigger moves ranking server-side, or on-device review shows
the spotlight or three-line names failing at normal Dynamic Type sizes.

## Related

- `docs/DESIGN.md`
- `docs/USER_FLOWS.md`
- `docs/STITCH_PROMPTS.md`
- `docs/TASKS.md`
- `docs/decisions/2026-09-02-real-feed-mvp-sections.md`
