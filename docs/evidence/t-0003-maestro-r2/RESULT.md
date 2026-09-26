# T-0003 revision 2 — BLOCKED after final repeatability failure

Contract: tyson-hu/dispatch-hub@0289644143eb2cf831b1d99abf7032588e915261; STATE 11; T-0003 revision 2; D1 REWORK.
Base: f71a1d90aaa7367359104fcaffa848afd6b30093.
Resumed R1: 71c690df65b9c59c84457e3d756ea1a9cb28973b.
Latest UI tested SHA: 66b02dd59008537797e40c33ce4cfd621809d865 (clean tracked tree).
Technical recovery started 2026-09-26 15:50:49 UTC; stopped by 16:39:31 UTC, within 60 minutes.
No further technical attempts are authorized by this report.

## Terminal result

**BLOCKED. A2 is demonstrated; final A3 repeatability is not met.**
The latest committed candidate passed once, then failed on the next independent
fresh fixture at the strict Comfort 0.5 assertion. Maestro completed the exact
increment tap, but its failure hierarchy still reports Comfort, not rated.
The final screenshot shows the rating form scrolled near its lower dimensions;
the hierarchy/visual mismatch and underlying interaction failure remain undiagnosed.
This is a separate blocker from Save Password. Further repair plus two complete
repeats could not safely fit the remaining budget, so execution stopped.

| Latest candidate | Run | Suite seconds | Result |
| --- | --- | --- | --- |
| 66b02dd | run-20260926-113438 | 111.872 | complete UI + exact local DB PASS |
| 66b02dd | run-20260926-113657 | 66.325 | FAIL at Comfort; persistence not reached |

[Final evidence](blocked-final/manifest.json) binds both summaries, XML results,
selected command events, failure hierarchy excerpt and inspected non-auth screenshot.
Each run used the same fixture recipe with a fresh synthetic confirmed account,
new synthetic product, zero rating rows and app clearState. No prior session or
rating was inherited. Raw artifacts and credentials remain ignored locally.

## Resolved password blocker and simulator conditions

The initial order-only diagnostic ran the dismissal wait at 10:53:24.994 CDT,
saw Not Now at 10:53:29.116 and completed its text-selected tap at 10:53:30.414.
The exact escaped Save Password absence assertion, subsequent business CTA and
rating interactions passed. Classification: **dismissal succeeded**:
the step executed, Maestro saw and located Not Now, the tap succeeded, and the
app became interactive. This was not an unexecuted step, inaccessible system
window or failed dismissal tap. See diagnostic-run.xml and historical run-01/
and run-02/dialog-events.json.

Stage 1 succeeded within 15 minutes. Stage 2 was unnecessary and skipped.
**No simulator password/AutoFill or host settings were changed.**
Original and final conditions are the same; no restoration action is needed.
Read-only observations (WebUI CookieAcceptPolicy only; Passwords domain absent)
are not a complete settings audit. The observed native Save Password prompt was
shown and dismissed; other password-manager/AutoFill configurations are untested.

Fixed environment: iPhone 18 Pro, iOS 27.0, simulator
B5343C0A-1D6E-4FA5-9C7D-B201CD0B38D0; Maestro 2.10.0; Java 21.0.2;
Expo 57.0.25/RN 0.86.3 development app com.tysonhu.eazyreview.dev.
R1 native binary reused with current Metro JavaScript on port 8087.
Dedicated disposable Supabase eazy-review-t0003, API 127.0.0.1:55321.
Task-owned Metro and Supabase stopped, simulator shut down; data volumes retained.

## Historical passes and review boundary

The original two consecutive complete passes were real, at
26177bc7cff03eada926189fa0e2996d583142b9:
run-20260926-110718 (134.020 s) and run-20260926-110950 (135.220 s).
They cover Browse/detail/login gate/password login/dismissal/all ten dimensions/
Save/restart score 5/edit Appearance 1.5/Save/restart score 6/exact stored row.
Their unchanged evidence is run-01/, run-02/, repeatability.json and screenshots/.
**These are historical results, not evidence for the later candidate.**

After those passes, d9816a5d34363788cf2630986a7376a8d92a6d32 added evidence/docs
and was pushed to [PR 63](https://github.com/tyson-hu/Eazy-Review/pull/63).
Existing Expo CI 36254832104 and CodeQL 36254832046 passed on that remote head.
The GitHub code/security reviews completed there; a P1 host-environment
inheritance finding remains unresolved on the remote PR.
Its local allowlist fix and placeholder-only regression pass; actual earlier
credential exposure is unknown, not established.
See [review-remediation.md](review-remediation.md).
Later local fixes and this terminal evidence have **not been pushed**.
PR 63 is now **Draft**. Its draft-conversion CodeQL run 36256237017 was skipped;
the earlier passes remain historical. Hosted CI does not validate those local commits.
Remediation verdict: **BLOCKED — current-head UI validation failed**.

## Validation, scope and next decision

Independent verifier ran 3 offline helper tests and full check:readonly
(110 structural/security tests, secret scan, typecheck and lint) successfully at
547a326bd200afca57f9196469f0c88dcf604b78. Latest UI-tested 66b02dd only removes
one generic hideKeyboard command and updates documentation; its UI result above
is authoritative. Terminal documentation/secret/diff checks are recorded in
blocked-final/validation.txt. No new full review was requested after the qualifying
GitHub baseline review. R1 CLI/MCP feasibility was reused, not rerun or called a new PASS.

The only app change is the invisible my-rating-score testID. No product behavior,
secure-input semantics, auth/API/data contract, dependency, framework, CI/EAS/cloud
gate or global settings changed. No sleeps, waitForAnimationToEnd additions or
authored coordinate selectors were used. No staging/production/real user data,
account deletion, paid cloud, merge, deployment, board writes or user acceptance.
Task 22 remains Pending; Task 23 was not started.

This smoke is intended to guard public browsing, login gating and rating persistence.
Successful historical runs cover native UI plus real local Auth/API/database reads.
Current repeatability remains blocked; Android, physical devices, hosted auth/email,
production RLS, other password managers and release readiness are not proven.

Minimal alternative: a separately authorized bounded follow-up focused only on
native rating-row scroll/tap reliability, preserving Maestro and the same local
environment. It needs additional time, not paid services or broader data authority.
One upstream question: approve that narrowly scoped follow-up budget?
