# T-0003 revision 2 — bounded Maestro continuation

Contract: `tyson-hu/dispatch-hub@0289644143eb2cf831b1d99abf7032588e915261`,
STATE 11, T-0003 revision 2, decision T-0003.D1 (REWORK).
Recovery started 2026-09-26 10:50:49 America/Chicago; technical budget 60 minutes.
Project base `f71a1d90aaa7367359104fcaffa848afd6b30093`; resumed R1 result
`71c690df65b9c59c84457e3d756ea1a9cb28973b` on `codex/t-0003-maestro`.
Remote master still matches the base. R1 CLI/MCP feasibility is referenced,
not rerun or claimed as new evidence. Its files and screenshots remain intact.

## Current evidence

The initial order-only diagnostic run passed in 134.452 seconds, including
all ten dimensions, save, restart/readback, edit, second restart/readback and
the local database check. This trial ran on an uncommitted candidate and does
not count toward the two committed formal repeats. Formal results pending.

One subsequent run at `36ce4aae92d0f9778b2994e13f96a79235552f62` failed
at the stricter My Rating `childOf` selector after save. iOS exposes the score
without the expected card ancestry. The bounded selector fix adds only the
invisible `my-rating-score` testID and asserts that identifier plus exact text.
The two formal repeats restart after this fix. The helper also now records
database-verification failure as failed, covered by an offline fault-injection
test; this closes the independent review's nonblocking evidence finding.

The dismissal wait ran at 10:53:24.994, saw Not Now at 10:53:29.116, located an
enabled accessibility element, and the tap completed at 10:53:30.414.
The exact escaped Save Password absence assertion, post-login CTA and rating
controls passed. Classification: **dismissal succeeded**. This is neither
an unexecuted close step nor an inaccessible system window nor a failed tap.
Maestro selected by visible text; no authored coordinate selector was used.

Stage 2 was unnecessary and was skipped. No simulator or host setting changed.
Read-only simulator preference observation: com.apple.WebUI contains only
CookieAcceptPolicy; com.apple.Passwords domain absent. These are not a complete
AutoFill-settings audit. Actual observed condition: native Save Password shown
and dismissed. No assertion is made about every password manager/provider.

## Reproduction and boundaries

See [the runbook](../../../.maestro/README.md) and
[`scripts/maestro-local.py`](../../../scripts/maestro-local.py).
Same R1 iPhone 18 Pro / iOS 27.0 simulator UDID, Maestro 2.10.0 / Java 21.0.2,
Expo 57.0.25 development build, Metro 8087 and dedicated local Supabase
eazy-review-t0003 / 127.0.0.1:55321. Each formal run must start with a fresh
synthetic account/product, zero rating rows and app clearState. Full repeat
commands and result SHA will be added after committed execution.

Only one invisible app testID changed; no application behavior, dependency,
auth/API/data contract, CI or cloud change.
Staging, production, real users, physical devices, Android and web not exercised.
No merge, deployment, human acceptance or Project #4 write; Task 22 stays Pending.
Selected evidence will contain only sanitized XML, summaries and decisive
non-authentication screenshots; private fixtures and raw artifacts stay ignored.
