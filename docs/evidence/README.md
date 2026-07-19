# Verification Evidence

Durable **verification artifacts** for interactive preview walks and UX screenshot audits. Not session memory — that stays in `docs/notes/` (`handoff.md`, `blocker-*.md`).

Procedure: `skills/interactive-preview-loop` → `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`.

## Layout

```txt
docs/evidence/<task-or-topic>/
  FINDINGS.md                 # optional; screenshot-audit mode
  RESULT.md                   # optional run report (or section in TASKS)
  screenshots/
    01-browse.png
    02-product-detail.png
    …
    web-01-browse.png         # optional web prefix when dual-env
```

Examples:

```txt
docs/evidence/task-10-baseline-ux/
docs/evidence/rating-flow-regression/
docs/evidence/product-detail-preview/
```

## Naming

- Prefer zero-padded flow order: `01-…`, `02-…`.
- Keep names short and stable; do not rename after findings cite them.
- Dual environment: simulator files unprefixed or `ios-`; web files `web-`.

## Environment status (exactly one per slot)

| Slot | Allowed values |
| --- | --- |
| iOS Simulator / web preview | `pass` \| `fail` \| `blocked` \| `not-run` |
| Physical device | `tested-pass` \| `tested-fail` \| `not-tested` |

## Commit policy

Commit evidence when referenced from `docs/TASKS.md` or included in an audit/fix PR. Evidence is verification output, not product documentation — do not treat it as a substitute for `docs/DESIGN.md` or `docs/USER_FLOWS.md` updates.
