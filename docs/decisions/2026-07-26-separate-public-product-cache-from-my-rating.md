---
id: decision-separate-public-product-cache-from-my-rating
date: 2026-07-26
status: accepted
area: architecture
tasks: [14, 15, 16, 18]
pr: 19
tags: [caching, my-rating, privacy, tanstack-query]
supersedes: []
---

# Separate public Product Detail cache from My Rating

## Context

Product Detail combines public catalog data with viewer-owned My Rating data,
including an optional private note. Caching both under a shared product key can
show one account's rating after an auth transition and forces otherwise public
catalog data to churn with session state.

## Decision

The shared `['product', productId]` query contains only
`ProductDetailPublicData`. Product Detail composes My Rating separately from
`['userRating', userId, productId]`; that query stays disabled until `userId`
is known. Auth transitions clear the prior user's scoped queries without
discarding valid public product data.

`ProductDetailData` may remain the composed screen-facing shape, but no shared
cache entry stores its `myRating` field.

## Consequences

- Public Browse and Product Detail data can survive sign-in, sign-out, and
  account switches.
- My Rating cache entries are unambiguously owned by one authenticated user.
- Rating mutations invalidate the user-scoped rating key and relevant public
  aggregate/product keys independently.
- Adapters and tests must distinguish fetched public data from the composed
  screen model.

## Revisit when

The cache layer enforces viewer identity in every Product Detail key with
equivalent privacy and invalidation guarantees, or Product Detail no longer
combines public and viewer-owned data.

## Related

- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/USER_FLOWS.md`
- `docs/decisions/2026-07-25-no-direct-postgrest-rating-upsert.md`
