# UI Audit Remediation — Web Preview Attempt 1

- Mode: `web-preview`
- Journey: Browse first paint at 393×852
- Environment matrix: mobile web `fail`; iOS Simulator `not-run`; physical device `not-tested`
- Overall result: `fail`
- Step results:
  1. Bundled mock image loaded on the first Browse card: `pass`.
  2. Product remained fully visible in the card image area: `fail` — `cover` produced an overly tight crop.
- Evidence directory: `docs/evidence/ui-audit-remediation-20260719-attempt1/`
- Evidence filename: `screenshots/web-01-browse.png`
- GitHub disposition: local-only diagnostic capture; not selected as representative proof.
- Finding: P2 — caused by this change — the product-photo crop hid most of the sneaker and did not satisfy the photography-first focal-point requirement.
- Known limitations: stopped before Detail and Rating after the first screen-level failure.
- Automated checks run separately: `npm run typecheck`, `npm run lint`, and `git diff --check` passed before this preview.
- Required next decision: return to the implementation workflow, switch product imagery to contained framing, then start a new preview run.
