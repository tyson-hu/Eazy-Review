---
id: decision-human-directed-skill-creation-waives-three-use
date: 2026-08-06
updated: 2026-08-06
status: accepted
area: agent-workflow
tasks: []
pr: 34
tags: [agents, security, skills, workflow]
supersedes: []
---

# Human-directed skill creation may waive the three-use threshold

## Context

`skills/skill-creator` used a three-occurrence threshold so agents would not
turn one-off chat instructions into permanent skills. That threshold was easy
to read as a hard ban on any skill with fewer than three prior uses, including
skills the human explicitly requested and reviewed.

PR #34 adds `pr-human-review` as a human-directed, reviewed skill. Available
evidence was one refined Task 14 acceptance-review process, not three separate
PR reviews. Keeping the skill without clarifying governance would leave a
standing contradiction between the library and the creation rule.

Waiving three-use must not be read as a weaker creation gate. A permanent
skill can still be malicious, unintentional, or defective if intent, scope,
overlap, quality, security, or post-write proof are skipped.

## Decision

The three-use threshold gates **agent-proactive** skill proposals only.

The human may explicitly request or approve a reviewed skill addition without
three prior occurrences. That path waives **only** the three-use threshold for
that skill.

On both paths, the Remaining gate in `skills/skill-creator/SKILL.md` remains
mandatory and complete:

1. Explicit human intent (not vague praise or inferred need).
2. Scoped draft approval (exact files and scope only).
3. Overlap and selection safety.
4. Quality bar (concrete trigger, actionable steps, verification, length).
5. Security and abuse bar (`docs/SECURITY.md`, `docs/MCP_WORKFLOW.md`,
   `docs/AGENT_WORKFLOW.md`; separate approval for `scripts/` / `templates/`).
6. Post-write proof (wrappers, indexes, `npm run check:skill-wrappers`).

Agents still must not create, delete, merge, or substantially modify skill
files, or edit skill indexes, without explicit approval of the draft. Agents
must not invent human direction, a three-use waiver, or approval.

`pr-human-review` is accepted under this human-directed path.

## Consequences

- Agents continue to wait for 3+ named occurrences before proposing skills on
  their own.
- A human-reviewed manual skill addition is valid without inventing three
  prior uses.
- Loosening three-use does not authorize malicious, accidental, or defective
  skill adds; those remain blocked by the Remaining gate.
- Agents must not invent a three-use waiver the human did not give.
- Skill overlap, trigger quality, security boundaries, and the hybrid
  approval gate remain required on both paths.

## Revisit when

Automatic skill proposal quality degrades because too many early patterns are
promoted through casual human direction, a Remaining-gate failure mode is
observed in practice, or a stronger evidence bar is needed for human-directed
additions.

## Related

- `skills/skill-creator/SKILL.md`
- `skills/pr-human-review/SKILL.md`
- `AGENTS.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/SECURITY.md`
- `docs/MCP_WORKFLOW.md`
- `docs/AGENT_WORKFLOW.md`
