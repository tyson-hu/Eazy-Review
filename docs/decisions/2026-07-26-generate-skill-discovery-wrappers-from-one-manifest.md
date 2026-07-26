---
id: decision-generate-skill-discovery-wrappers-from-one-manifest
date: 2026-07-26
status: accepted
area: agent-workflow
tasks: []
pr: 17
tags: [agents, ci, skills, tooling]
supersedes: []
---

# Generate skill discovery wrappers from one manifest

## Context

Canonical skill routines are shared across multiple agent surfaces, but Codex
and Claude discover them through separate wrapper trees. Hand-maintained copies
previously drifted or lost required metadata, and a prose-parsing validator
became complex while still missing Markdown edge cases.

## Decision

Keep human-authored routines in `skills/<name>/SKILL.md`. Store the authoritative
discovery name and description for every routine in the sorted
`skills/manifest.json`, then generate both `.agents/skills/` and
`.claude/skills/` wrappers deterministically from that manifest.

CI and `npm run check` verify the manifest, the exact canonical directory
inventory, non-empty canonical files, generator tests, and byte-for-byte
generated wrapper output. The generator does not parse or rewrite canonical
skill prose.

## Consequences

- A skill metadata change is made once in the manifest and regenerated into
  both discovery trees.
- Generated wrappers are never edited by hand.
- Unexpected files prevent stale generated directories from being removed.
- Canonical routine structure remains governed by review and the skill-creator
  workflow rather than an expanding Markdown parser.

## Revisit when

All supported agent tools reliably discover one standard wrapper root, or the
agent-skills standard adds a native reference format that removes the duplicate
generated trees.

## Related

- `skills/manifest.json`
- `scripts/generate-skill-wrappers.cjs`
- `scripts/generate-skill-wrappers.test.cjs`
- `skills/skill-creator/SKILL.md`
- `.github/workflows/expo-ci.yml`
