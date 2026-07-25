# Decision Records

Human-authored ADR-style records live in this directory. `docs/DECISIONS.md`
is a generated dashboard; do not edit it directly.

## What belongs here

Create or update one decision record only when a choice has durable,
high-impact consequences for future work:

- Changes architecture or data ownership.
- Establishes a security or authorization rule.
- Changes product behavior or required terminology.
- Selects a tool, dependency strategy, or workflow with ongoing consequences.
- Defines an important tradeoff, rollback condition, or revisit trigger.
- Supersedes, reverses, or deprecates an existing decision.

Do not create a decision record for:

- A typo, formatting pass, or routine documentation synchronization.
- A routine bug fix that restores already-documented behavior.
- Closing a review finding when no new rule was introduced.
- Task progress, completion status, or a readiness result.
- Running validation or repairing generated/discovery drift.
- Patch-version alignment or a minor implementation detail already clear from
  code and its canonical contract.

Those changes belong in `docs/TASKS.md`, a PR, a commit, a changelog, or the
canonical product/technical document. A decision record explains why a durable
choice exists; it is not a list of files changed while implementing it.

## Statuses

Use only:

- `proposed` — under consideration and not yet binding.
- `accepted` — currently binding.
- `superseded` — replaced by another decision; set `superseded_by`.
- `reversed` — intentionally undone without a replacement.
- `deprecated` — still present but scheduled for removal.

Keep superseded, reversed, and deprecated records. A replacement lists the old
record in `supersedes`; the old record points back with `superseded_by`.

## File and metadata rules

- Filename: `YYYY-MM-DD-lowercase-slug.md`.
- `id`: stable lowercase slug prefixed with `decision-`; never reuse it.
- `date`: original decision date and filename date.
- `updated`: optional; use it when status or substance changes later.
- `area`: one of `product-ux`, `data-supabase`, `auth-security`,
  `architecture`, `tooling-ci`, or `agent-workflow`.
- `tasks`: sorted task numbers, or `[]` when the decision is not task-specific.
- `pr`: a PR number, or `null`.
- `tags` and `supersedes`: sorted inline arrays of lowercase slugs/IDs.

Template:

```md
---
id: decision-short-stable-id
date: YYYY-MM-DD
status: proposed
area: architecture
tasks: []
pr: null
tags: [example, second-tag]
supersedes: []
---

# Decision title

## Context

What made a durable choice necessary.

## Decision

The choice future work must follow.

## Consequences

- Important benefit, constraint, or tradeoff.

## Revisit when

The condition that would justify reconsidering the choice.

## Related

- `path/to/canonical-doc.md`
```

## Reading decisions

1. Read the generated `docs/DECISIONS.md` index.
2. Find the current task number or matching area.
3. Open only the linked decision records relevant to the task.
4. Search superseded records or the archive only when historical reasoning is
   needed.

Useful searches:

```bash
rg "tasks:.*15" docs/decisions
rg "area: auth-security" docs/decisions
rg "tags:.*supabase" docs/decisions
rg "status: accepted" docs/decisions
```

## Editing and validation

1. Add or edit the individual record.
2. Run `npm run decisions:build` to regenerate `docs/DECISIONS.md`.
3. Run `npm run decisions:check` before handoff; CI and `npm run check` run the
   same stale-index and metadata validation.

`npm run decisions:check` requires the five template headings as exact
level-two lines outside fenced code (`## Context`, `## Decision`,
`## Consequences`, `## Revisit when`, `## Related`), each once and in that
order. Prefixed or alternate wording does not count. Supersession links must
be acyclic: a record may not supersede itself, and `superseded_by` chains
must not form a cycle.

The complete legacy log is preserved at
`docs/decisions/archive/2026-pre-adr-log.md`. Do not split every archived entry
into a standalone record. Promote an archived choice only if it becomes
currently relevant and still meets the high-impact criteria above.
