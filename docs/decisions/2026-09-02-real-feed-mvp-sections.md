---
id: decision-real-feed-mvp-sections
date: 2026-09-02
status: accepted
area: product-ux
tasks: [21]
pr: 52
tags: [catalog, discovery, feed]
supersedes: []
---

# Use three client-side Feed sections with a min-two ranked threshold

## Context

Task 21 replaces the Feed placeholder with a small real discovery surface. The
task allowed Newly Added, Best Eazy Scores, and either Most Rated or Best
Community Scores only when data supported it. The 27-product seed has enough
Eazy assessments for a ranked editorial section, but it writes no community
ratings. The Feed needed a durable rule for which third section to use, when a
ranking is honest, and how to avoid becoming a second Browse list.

## Decision

Feed shows at most three sections, in this order: Newly Added, Best Eazy
Scores, and Most Rated. It reuses the published catalog query and ProductCard.
Newly Added reverses the catalog list and shows when at least one published
product exists. Ranked sections require at least two qualifying products and
cap at five cards. Most Rated qualifies on `ratingCount >= 1` and ranks by
that count, not Community Score. A later section whose ordered product ids
match an earlier visible section is hidden. Do not add a feed-configuration
table, a Feed query key, or a Trending label. Keep `selectFeedSections` as a
one-caller helper so ranking, caps, and duplicate-hide rules stay covered by
isolated unit tests outside the Feed screen.

## Consequences

- The current seed shows Newly Added and Best Eazy Scores. Most Rated stays
  hidden until at least two products have community ratings.
- Feed shares Browse's catalog cache, so a rating save can reveal Most Rated
  without a new request shape.
- Best Community Scores remains unused for the MVP.

## Revisit when

Community ratings exist at catalog scale, or a measured Task 20 trigger
justifies server-side ranking, pagination, or a different third section.

## Related

- `docs/TASKS.md`
- `docs/USER_FLOWS.md`
- `docs/API_CONTRACTS.md`
- `docs/DESIGN.md`
