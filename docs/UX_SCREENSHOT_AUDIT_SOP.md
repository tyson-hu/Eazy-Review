# UX Screenshot Audit SOP

Parent-owned procedure for evidence-first UX audits (readiness gates, integrated re-audits). Combines `docs/MOBILE_SIMULATOR_SOP.md` (primary mobile) and `docs/WEB_MOBILE_PREVIEW_SOP.md` (interactive + secondary). Skill entry: `skills/interactive-preview-loop`. This is **not** an implementer feature packet and **not** a substitute for `npm run check`.

Baseline and walk modes are **read-only**: do not edit product code or open fix packets until findings are triaged.

## When To Use

- Explicit UX / flow review tasks (e.g. Task 10-style readiness gates).
- Phase 4 integrated re-audit after accepted UX fixes.
- Any request for numbered screenshot evidence before filing findings.

Do **not** expand into out-of-scope surfaces named in the task (Feed, Account, auth, Supabase, social, etc.) unless the parent packet says so.

## Roles

| Role | Responsibility |
| --- | --- |
| Parent agent | Scope, capture plan, findings triage, accept/reject/defer, GO decision |
| Implementer | Only after findings are accepted — bounded packets |
| Reviewer / verifier | Code review and checks **after** fixes — not for baseline audit captures |

Baseline audit: **no product code edits**. Docs may update acceptance criteria and progress only.

## Phase Sequence

1. **Tighten acceptance** into testable criteria in `docs/TASKS.md` (if still vague).
2. **Baseline capture** — complete the required step table before writing findings.
3. **Findings report** — every finding cites a screenshot id or observed step.
4. **Parent triage** — Accept / Reject / Defer each finding.
5. **Fix packets** — only accepted items; eleven-field packets per `docs/AGENT_WORKFLOW.md`.
6. **Integrated re-audit** — recapture the journey; recheck every accepted P0–P2.
7. **Readiness decision** — GO / CONDITIONAL GO / NO-GO recorded in `docs/TASKS.md`.

## Evidence Layout

```txt
docs/evidence/<task-or-topic>/
  FINDINGS.md
  screenshots/
    01-….png          # iOS Simulator (flow order)
    web-01-….png      # Mobile web (optional dual-env)
```

Layout and commit policy: `docs/evidence/README.md`. Evidence is a **verification artifact**, not session memory (`docs/notes/` is reserved for `handoff.md` and `blocker-*.md`).

Commit evidence when it supports a PR or durable triage.

## Capture Rules

1. Flow order — capture the journey in user order when possible.
2. Dual environment — simulator primary for chrome/Alert; web for scripted interaction and full-page proof.
3. One claim → one evidence id (or explicit “observed step” when a screenshot cannot prove it).
4. State **limits** in the report (keyboard, physical device, deep-link stack artifacts, MCP dialog quirks).
5. Findings severity:

| Level | Meaning | Gate handling |
| --- | --- | --- |
| P0 | Flow impossible, crash, data loss | Must fix |
| P1 | Core journey blocked or seriously misleading | Must fix |
| P2 | Material friction / unclear state / a11y risk on core flow | Fix when it affects the audited journey |
| P3 | Polish / future | Defer to `docs/TASKS.md` |

## Finding Template

For each finding record:

- Severity
- Screenshot / step
- User impact
- Evidence
- Recommended correction
- Owning file or documentation
- Must fix now or deferred
- Revalidation flow

## Default Core Journey (Browse → Detail → Rating)

Unless the task supplies a different table, cover at least:

```txt
Tab nav → Browse default
→ search hit / empty / recoverable error
→ product card → Detail (unrated + rated + null/zero score edges)
→ Rate / Edit → invalid submit → valid submit → updated My Rating
→ back navigation → session honesty → reload reset
→ unknown Detail and Rate routes
```

## Integrated Re-Audit Walks

After fixes, re-run both journeys on an interactive mobile viewport (simulator and/or web at 393):

```txt
Browse → search → unrated Detail → Rate → invalid → valid → Detail → Back → Browse
Browse → rated Detail → Edit → prefill → change → submit → Detail
Direct /product/:id/rate → submit → Detail
```

## Documentation Gate

- Always: `docs/TASKS.md` (criteria, audit result, accepted/deferred findings, GO decision).
- When navigation/behavior changes: `docs/USER_FLOWS.md`.
- When reusable design rules change: `docs/DESIGN.md`.
- When frontend data boundaries change: `docs/API_CONTRACTS.md`.
- Meaningful process/product calls: `docs/DECISIONS.md`.

Final validation after the last code change: `npm run typecheck`, `npm run lint`, `npm run check`, `git diff --check`, `git status --short` (docs-only audits may skip compile commands with an explicit reason).
