# SOP — `docs/evidence/` GitHub Uploads

Canonical procedure for what evidence leaves the working machine for GitHub. Capture and audit procedure: `skills/interactive-preview-loop` → `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`. Layout and status vocabulary: `docs/evidence/README.md`.

## 1. Purpose

Keep reports and decisive proof on GitHub while retaining full non-sensitive raw screenshot sets locally. Never overwrite or delete earlier valid evidence during a re-audit; an accidental sensitive capture is not valid evidence and follows the security response in section 3.

## 2. Always upload

Upload documentation that explains the evidence:

- `docs/evidence/README.md`
- Run reports under the task folder (`FINDINGS.md` and/or `RESULT.md`)

For **Task 10** specifically, also upload these reports:

- `docs/evidence/task-10-baseline-ux/FINDINGS.md`
- `docs/evidence/task-10-f4-check/RESULT.md`
- `docs/evidence/task-10-reaudit/RESULT.md`

Upload exactly these **12** representative PNGs for Task 10:

| Claim | Path |
| --- | --- |
| F4 Back button | `docs/evidence/task-10-f4-check/screenshots/web-01-detail-back-button.png` |
| Browse default | `docs/evidence/task-10-reaudit/screenshots/ios-01-browse-default.png` |
| Empty search recovery | `docs/evidence/task-10-reaudit/screenshots/ios-02-empty-search-clear-action.png` |
| Sticky rating CTA | `docs/evidence/task-10-reaudit/screenshots/ios-04-unrated-detail-sticky-cta.png` |
| Native validation errors | `docs/evidence/task-10-reaudit/screenshots/ios-06-invalid-rating-errors.png` |
| Submit reachability | `docs/evidence/task-10-reaudit/screenshots/ios-08-submit-reachable-after-keyboard-scroll.png` |
| Session save alert | `docs/evidence/task-10-reaudit/screenshots/ios-09-session-save-alert.png` |
| Updated My Rating | `docs/evidence/task-10-reaudit/screenshots/ios-10-post-submit-my-rating.png` |
| Edit prefill | `docs/evidence/task-10-reaudit/screenshots/web-13-edit-rating-prefill.png` |
| Zero Community Score | `docs/evidence/task-10-reaudit/screenshots/web-18-zero-community-detail.png` |
| Null Eazy Score | `docs/evidence/task-10-reaudit/screenshots/web-19-null-eazy-detail.png` |
| Accessibility proof | `docs/evidence/task-10-reaudit/screenshots/web-23-invalid-association-proof.png` |

Future audits choose a new smallest proof set (section 6); do not assume Task 10’s twelve files apply to every task.

## 3. Do not upload

Keep these non-sensitive files locally:

- All **33** Task 10 baseline screenshots, including `probe.png`
- The other **31** Task 10 re-audit screenshots
- Duplicate, exploratory, temporary, or diagnostic-only debugging captures. A sanitized, decisive before/after or resolved-finding proof may still be selected under section 4.
- `.DS_Store` and other operating-system metadata

Never upload, sync, or transmit a screenshot containing secrets, credentials, private information, or personal data to GitHub, cloud storage, chat, logs, or a PR (`docs/SECURITY.md`). Do not intentionally create or retain one. If one is created accidentally, keep the original on the working machine only long enough to remove it safely and follow the exposure-response guidance in `docs/SECURITY.md`; the original must never leave the machine. If durable proof is still required, create a separate sanitized recapture that contains no sensitive data. This security response is the exception to the raw-evidence retention rule.

The Task 10 selection is enforced by `.gitignore` (baseline `screenshots/` ignored; re-audit `screenshots/*` ignored with explicit un-ignores for the eleven committed re-audit PNGs; F4 PNG is not ignored).

## 4. Evidence selection rule

A screenshot belongs on GitHub only when it proves a distinct, important claim such as:

- A resolved P1/P2 or core-flow finding
- A critical before/after state
- Platform-specific behavior that text alone cannot demonstrate
- A key success state, accessibility result, or important edge case

Do not upload several screenshots that prove the same claim. Full journey captures can remain local when the report records the result and limitations honestly.

## 5. Report requirements

Every evidence run must record:

- Mode and journey
- Environment statuses
- Overall result
- Step-by-step results
- Findings and severity
- Evidence filenames
- Known limitations
- Checks run separately
- Required next decision
- Which files are selected for GitHub versus local-only (record the intended disposition before commit and the final disposition at handoff)

When a report names an omitted screenshot, label its filename as a **local capture ID** — not a repository-hosted file.

## 6. Future audits

For a new audit:

1. Create a new `docs/evidence/<task-or-topic>/` directory.
2. Never replace an earlier baseline or re-audit directory.
3. Capture the complete raw set locally.
4. Select the smallest representative GitHub proof set.
5. Update the run report, `docs/TASKS.md`, and ignore/allowlist rules together.
6. Use stable numbered filenames and do not rename images after reports cite them.

## 7. Pre-upload verification

After staging the intended proof set, run:

```bash
git status --short
git ls-files docs/evidence
git ls-files docs/evidence/task-10-baseline-ux docs/evidence/task-10-f4-check docs/evidence/task-10-reaudit | awk '/\.png$/ {count++} END {print count+0}'
git ls-files --others --ignored --exclude-standard docs/evidence
git diff --check
git diff --cached --name-only
git diff --cached --check
```

For the current Task 10 evidence, the Task 10-scoped tracked PNG count above must equal `12`. For a future audit, scope the count to that audit's evidence directory and compare it with the proof set declared in its run report; do not use a repository-wide fixed total. Confirm the cached file list contains no ignored screenshot, `.DS_Store`, secret, or local session file (`docs/notes/handoff.md`) before committing.
