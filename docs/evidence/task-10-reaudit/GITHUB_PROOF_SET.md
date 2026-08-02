# Task 10 GitHub Proof Set — Historical Allowlist

This historical appendix records the exact Task 10 evidence selected for Git.
The reusable selection and upload procedure remains in
`docs/EVIDENCE_GITHUB_UPLOAD_SOP.md`; future audits choose their own smallest
proof set and do not inherit this allowlist.

## Reports

- `docs/evidence/task-10-baseline-ux/FINDINGS.md`
- `docs/evidence/task-10-f4-check/RESULT.md`
- `docs/evidence/task-10-reaudit/RESULT.md`

## Representative PNGs

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

The Task 10-scoped tracked PNG count is 12. Baseline screenshots, the remaining
re-audit captures, probes, duplicates, and diagnostic captures stay local when
non-sensitive. The repository `.gitignore` carries the historical Task 10
selection mechanics; do not generalize its fixed count to later audits.
