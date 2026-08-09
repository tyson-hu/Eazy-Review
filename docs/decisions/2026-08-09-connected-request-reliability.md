---
id: decision-connected-request-reliability
date: 2026-08-09
status: accepted
area: architecture
tasks: [15, 17]
pr: null
tags: [network, offline, query, ratings, timeout]
supersedes: []
---

# Fail-fast offline writes and bounded request deadlines

## Context

Physical iPhone testing of Task 17 showed Save remaining in an indefinite
"Saving..." state while offline. TanStack Query’s default mutation
`networkMode: 'online'` can pause mutations before `mutationFn` runs. Also,
device connectivity (NetInfo) is not proof the development Supabase host is
reachable, so requests need a bounded deadline distinct from “offline”.

## Decision

1. **NetInfo / onlineManager is connectivity evidence**, not proof the backend
   is reachable.
2. **User-triggered writes fail fast when explicitly offline.** For rating save,
   use `networkMode: 'always'` so `mutationFn` runs and returns a controlled
   domain offline error rather than pausing. Do not apply `always` globally to
   every query without similar justification.
3. **Network requests use a bounded deadline** (default **10 seconds**, matching
   the existing catalog timeout) via AbortController that aborts the underlying
   Supabase/PostgREST request. Document the constant; do not rely on native
   fetch alone.
4. **No MVP automatic offline write queue** for ratings. Preserve form state,
   report failure, let the user retry after reconnect. Community Score
   ownership and concurrency rules make queued mutation product work out of
   scope for Task 17.
5. **Paused TanStack state is not active loading.** Do not show indefinite
   LoadingState when `isPending` + `fetchStatus === 'paused'` with no cache.
   Prefer cached data when available; offline explicit error when not.
6. Transport classifications stay distinct: offline, timeout, backend
   unreachable, unauthorized, validation, server error. Abort from navigation
   cancellation is not presented as timeout.

## Consequences

- Shared utilities under `src/lib/network/` serve connected actions beyond
  ratings.
- Screens treat mutation `isPaused` separately from in-flight save work.
- Catalog connected-read offline behavior from Task 15 remains in force.

## Revisit when

Product authorizes durable offline mutation queues or a different default
deadline for long-running operations.

## Related

- `docs/DESIGN.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md` (Tasks 15, 17)
- `src/lib/network/requestTimeout.ts`
- `src/lib/query/lifecycle.ts`
