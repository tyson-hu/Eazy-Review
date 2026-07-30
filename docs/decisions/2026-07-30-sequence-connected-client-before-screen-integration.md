---
id: decision-sequence-connected-client-before-screen-integration
date: 2026-07-30
status: accepted
area: architecture
tasks: [13, 14, 15, 16, 17, 18, 19]
pr: null
tags: [authentication, caching, integration, task-sequencing]
supersedes: [decision-security-first-supabase-task-sequencing]
---

# Build the connected client foundation before screen integration

## Context

The security-first Tasks 11–12 are complete. The remaining old sequence placed
TanStack Query after connected reads/auth/writes, required a temporary
viewer/product rating map, and combined core auth, recovery, and deletion into
one review boundary.

## Decision

Keep Task 13 as the deterministic seed milestone. Build the Supabase client,
generated types, Query client, query keys, and React Native lifecycle/online
integration in Task 14 before connecting screens. Task 15 owns anonymous
catalog reads without a temporary rating bridge; Tasks 16, 18, and 19 split
core auth, recovery, and deletion; Task 17 owns persistent My Rating, Rated
Products, cache invalidation, and app-level verification of the existing
server-owned aggregate behavior.

## Consequences

- Connected screens begin on the durable cache/lifecycle architecture.
- No UUID session-rating abstraction is built solely to be deleted.
- Auth, recovery, and destructive account behavior remain independently
  reviewable.
- Task 17 verifies accepted aggregate behavior without reopening the schema or
  trigger mechanism.

## Revisit when

A concrete implementation blocker proves this order unsafe or impossible and a
replacement preserves public browsing, owner isolation, and separate
production/destructive authorization gates.

## Related

- `docs/TASKS.md`
- `docs/ROADMAP.md`
- `docs/API_CONTRACTS.md`
- `docs/decisions/2026-07-26-separate-public-product-cache-from-my-rating.md`
