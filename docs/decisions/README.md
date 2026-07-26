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
Only an `accepted` record may **newly** supersede another decision — a
`proposed` replacement must not mark the old record `superseded`, or the
generated index would drop binding guidance before the replacement is
approved. When that accepted replacement is later superseded itself, it may
retain its historical `supersedes` list while `status: superseded`. Multi-
generation chains (`A ← B ← C`) are valid: every immediate forward/back link
must agree, the graph must be acyclic, and every `superseded_by` chain must
terminate at a currently `accepted` record.

## File and metadata rules

- Filename: `YYYY-MM-DD-lowercase-slug.md` (lowercase `.md` only). Misnamed
  files such as `.MD`, `.markdown`, or `.md.bak` are rejected by
  `npm run decisions:check`, not silently ignored.
- `id`: stable lowercase slug prefixed with `decision-`; never reuse it.
- `date`: original decision date and filename date.
- `updated`: optional; use it when status or substance changes later.
- `area`: one of `product-ux`, `data-supabase`, `auth-security`,
  `architecture`, `tooling-ci`, or `agent-workflow`.
- `tasks`: sorted positive safe integers (JavaScript `Number.isSafeInteger`),
  or `[]` when the decision is not task-specific.
- `pr`: a positive safe integer (JavaScript `Number.isSafeInteger`), or `null`.
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

Titles must not contain Markdown link delimiters (`[`, `]`, or `\`) so the
generated index cannot reshape links.

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

`npm run decisions:check` requires exactly one unfenced level-one title and
the five template headings as exact level-two lines outside fenced code
(`## Context`, `## Decision`, `## Consequences`, `## Revisit when`,
`## Related`), each once and in that order. Prefixed or alternate wording does
not count. Each required section’s body is bounded by the next unfenced
level-two heading of any name (so an empty `## Context` followed by
`## Notes` does not false-pass) and must contain at least one substantive
visible unfenced line (empty fenced blocks, HTML comments — including
multi-line `<!-- … -->` — empty Markdown block markers such as `-`,
`>`, `1.`, `> -`, or `- [ ]`, and link-reference definitions such as
`[label]: https://example.invalid` alone do not count). Headings inside backtick or
tilde fences (` ``` ` / `~~~`) and text inside HTML comments are ignored for
both the title and required sections; a fence closes only with a compatible
marker and run length (an opposite marker inside the fence stays content).
Supersession links must be acyclic: a record may not supersede itself,
`superseded_by` chains must not form a cycle, and every superseded chain must
terminate at an `accepted` record (intermediate replacements may themselves be
`superseded`).

The complete legacy log is preserved at
`docs/decisions/archive/2026-pre-adr-log.md`. Do not split every archived entry
into a standalone record. Promote an archived choice only if it becomes
currently relevant and still meets the high-impact criteria above.
`npm run decisions:check` verifies that archive against a committed SHA-256
digest of **LF-normalized** UTF-8 text, and compares the generated
`docs/DECISIONS.md` index after the same LF normalization (CRLF checkouts with
`core.autocrlf=true` must not fail when content is unchanged). If you
intentionally rewrite the archive, update `EXPECTED_ARCHIVE_SHA256` in
`scripts/build-decision-index.cjs`.
