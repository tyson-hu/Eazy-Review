---
id: decision-adopt-ego-browser-for-sdlc
date: 2026-09-05
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [browser, evidence, workflow]
supersedes: []
---

# Adopt ego-browser for browser-based SDLC work

## Context

Candidate C began as a capability comparison against the Playwright-specific
web preview SOP. The user explicitly directed replacement of Playwright with
ego-browser throughout the SDLC on 2026-09-05.

## Decision

Use ego-browser for Eazy Review browser research, design inspection, previews,
debugging, UX evidence and release verification. MCP_WORKFLOW owns tool policy;
WEB_MOBILE_PREVIEW_SOP owns app web evidence. Use existing specialized skill
routing; no new adapter framework, dependency or global configuration change.

## Consequences

One project browser workflow replaces provider-specific Playwright recipes.
Driver choice does not establish capability parity: verify each required
criterion and record gaps. In particular, semantic snapshots are not assumed
to be full accessibility proof. Native and physical acceptance remain separate.
Historical evidence keeps its actual driver attribution. Missing capability
requires diagnosis or an explicit tooling decision, not silent fallback.

## Revisit when

A required browser criterion cannot be supported reliably by the installed
runtime. Preserve its failed evidence and propose a bounded remedy.

## Related

- [Tool policy](../MCP_WORKFLOW.md)
- [Web preview procedure](../WEB_MOBILE_PREVIEW_SOP.md)
