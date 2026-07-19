# UI Audit Remediation — Web Preview Attempt 2

- Mode: `web-preview`
- Journey: Browse first paint at 393×852
- Environment matrix: mobile web `fail`; iOS Simulator `not-run`; physical device `not-tested`
- Overall result: `fail`
- Step results:
  1. Product image used contained framing: `pass` — computed `background-size` was `contain`.
  2. Product remained fully visible in the card image area: `fail` — the bundled 1200×800 source dimensions overrode class-based image sizing and the clip still showed a close-up.
- Evidence directory: `docs/evidence/ui-audit-remediation-20260719-attempt2/`
- Evidence filename: `screenshots/web-01-browse.png`
- GitHub disposition: local-only diagnostic capture; not selected as representative proof.
- Finding: P2 — caused by this change — local bundled image dimensions must be explicitly constrained to the card image wrapper on web.
- Known limitations: stopped before Detail and Rating after the first screen-level failure.
- Automated checks run separately: `npm run typecheck`, `npm run lint`, and `git diff --check` passed before this preview.
- Required next decision: return to the implementation workflow, add explicit 100% image dimensions, then start a new preview run.
