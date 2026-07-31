---
id: decision-versioned-eazy-assessments
date: 2026-07-25
updated: 2026-07-30
status: accepted
area: data-supabase
tasks: [11, 12, 15]
pr: 14
tags: [assessments, eazy-score, schema, supabase]
supersedes: []
---

# Use versioned eazy_assessments with one current row

## Context

The proposed schema, Task 12 public-read policy, and Detail adapter contract
already assume a current editorial Eazy Score row. Leaving assessment history
as an open Task 11 choice (versioned `is_current` vs overwrite-only) would let
an implementer omit `is_current` and then break the Task 12 policy and the
adapter that selects the current assessment.

## Decision

Task 11 ships versioned `eazy_assessments` rows with required
`is_current boolean not null` and the partial unique index
`eazy_assessments_one_current_per_product` so each product has at most one
current row. Overwrite-only storage is rejected for MVP.

Task 12’s public SELECT policy and Task 15’s assessment adapter must filter
`is_current = true` (and published products). Historical rows may exist with
`is_current = false` for audit; they are not catalog-readable.

## Consequences

- Schema, RLS, and frontend contracts stay aligned before the first migration.
- Editorial reassessments append a version and flip the `is_current` flags
  rather than silently destroying history.
- Task 11 must include `is_current` and the partial unique index; Task 12 must
  not invent an alternate assessment-read shape.

## Revisit when

Product requires a different assessment lifecycle (for example overwrite-only
admin tooling with no history, or multiple concurrent published methodologies
without a single current flag).

## Related

- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md` (Tasks 11, 12, 14)
- `skills/supabase-schema-change/SKILL.md`
