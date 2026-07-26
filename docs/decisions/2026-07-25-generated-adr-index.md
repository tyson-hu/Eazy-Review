---
id: decision-generated-adr-index
date: 2026-07-25
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [adr, documentation, generation, workflow]
supersedes: []
---

# Use individual ADR records with a generated decision index

## Context

The legacy `docs/DECISIONS.md` mixed durable reasoning with change history,
routine fixes, validation results, and task progress. Reading it became costly,
and individual decisions could not be linked or superseded cleanly.

## Decision

Humans edit one ADR-style file per currently relevant, durable high-impact
decision under `docs/decisions/`. `docs/DECISIONS.md` is a generated index and
must stay mechanically current. The complete legacy log remains in one
historical archive; it is not split into one file per old entry.

## Consequences

- CI validates metadata, IDs, statuses, supersession links, and index freshness.
- Routine fixes, task progress, and validation stay in tasks, PRs, commits, or
  changelogs rather than becoming ADRs.
- An archived choice is promoted only when it becomes relevant again and still
  meets the current recording threshold.

## Revisit when

The number or complexity of active records outgrows the dependency-free
generator, or another system can preserve the same linkability, history, and
stale-index protection with less maintenance.

## Related

- `docs/decisions/README.md`
- `docs/decisions/archive/2026-pre-adr-log.md`
- `scripts/build-decision-index.cjs`
- `docs/DOCUMENTATION_POLICY.md`
