---
id: decision-staged-codebase-simplification
date: 2026-08-30
status: accepted
updated: 2026-09-02
area: architecture
tasks: []
pr: 46
tags: [codebase-health, dependencies, simplification]
supersedes: []
---

# Stage codebase simplification by ownership boundary

## Context

A broad read-only audit at base SHA
`db27309005e14d80f67df9bfe9cb4debd6dd47b6` found three useful
simplification boundaries: unused Create Expo starter code and dependencies,
the disconnected mock-era product-detail contract, and a second native URL
polyfill layered over Expo SDK 57's runtime. The same audit found large areas
whose complexity is deliberate: Auth and account-deletion coordination,
request deadlines and cancellation, applied migrations, generated agent
artifacts, historical evidence, and the temporary iOS CNG compatibility
plugin.

A repository-wide cleanup without stable boundaries would mix very different
risks, make failures hard to attribute, and invite deletion based on line count
rather than contract evidence. The detailed evidence and executable packets
live in the related implementation plan.

## Decision

Use a staged simplification program with one ownership boundary per
validated batch:

1. Remove the unreachable Create Expo starter subtree, its sample font, and
   direct dependencies or config entries that have no surviving consumer.
2. Retire the disconnected mock-era product fixtures and their legacy type and
   adapter surface only after explicitly accepting the loss of that global
   canned-catalog capability. Preserve the public-versus-user cache boundary.
3. Remove `react-native-url-polyfill` only after a boot-order probe and native
   cold-start/deep-link checks prove Expo SDK 57 owns `URL` and
   `URLSearchParams` before the Supabase singleton is evaluated.

For every batch, map all runtime, test, documentation, generated, persisted,
and compatibility consumers; record the behavior surrendered; run a decisive
check plus the affected repository gates; and leave an undo path. A failed
proof keeps the current code instead of weakening the check or adding a new
compatibility wrapper.

This record is the binding simplification boundary. It authorizes no future
packet, implementation, commit, push, pull request, deployment, hosted
configuration, migration, account deletion, or production action by itself.
Each selected cut remains a separate scope and validation boundary.

Do not treat security isolation, authorization, trust-boundary validation,
data-loss prevention, accessibility essentials, request cancellation,
applied migration history, generated-source ownership, or retained acceptance
evidence as incidental simplification targets.

## Consequences

- The first batch can remove about 199 lines of unreachable starter helpers, a
  92 KB sample font, and two direct native-facing dependencies without changing
  a current product path.
- The second batch offers the largest conceptual reduction: at least 409 lines
  of legacy mock modules, eight bundled fixture images, and one obsolete
  product-detail representation. It gives up the repository-wide canned
  eight-product detail fixture; future isolated tests must use current scoped
  fixtures.
- The third batch removes one dependency and one competing global owner, but
  accepts Expo entry order as a runtime contract. It remains conditional until
  native proof exists.
- Small dead exports or components should be folded into the boundary that
  owns them, not turned into separate cleanup projects.
- No deletion-count or line-count target exists. A retained, justified
  candidate is a valid result.

## Revisit when

- A production, dynamic, external, persisted, or compatibility consumer is
  discovered for a selected candidate.
- Product work again requires a globally available mock catalog rather than
  scoped test fixtures.
- Expo, React Native, Xcode, or the app entrypoint changes the URL bootstrap or
  iOS generation contract.
- An accepted decision that currently protects a retained subsystem is
  superseded by a narrower owner with equivalent guarantees.

## Related

- `docs/superpowers/plans/2026-08-30-staged-codebase-simplification.md`
- `docs/TASKS.md`
- `docs/API_CONTRACTS.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/decisions/2026-07-26-separate-public-product-cache-from-my-rating.md`
- `docs/decisions/2026-08-07-temporary-ios-device-build-cng-plugin.md`
- `docs/decisions/2026-08-09-connected-request-reliability.md`
