# T-0003 revision 2 — two consecutive complete Maestro passes

Contract: `tyson-hu/dispatch-hub@0289644143eb2cf831b1d99abf7032588e915261`,
STATE 11, T-0003 revision 2, decision T-0003.D1 (REWORK).
Recovery started 2026-09-26 10:50:49 America/Chicago; technical budget 60 minutes.
Project base `f71a1d90aaa7367359104fcaffa848afd6b30093`; resumed R1 result
`71c690df65b9c59c84457e3d756ea1a9cb28973b` on `codex/t-0003-maestro`.
Remote master still matches the base. R1 CLI/MCP feasibility is referenced,
not rerun or claimed as new evidence. Its files and screenshots remain intact.

## Result and exact tested version

**Ready for upstream review; not human acceptance.** Complete core flow passed
twice consecutively at `26177bc7cff03eada926189fa0e2996d583142b9`, with a clean
tracked tree at both starts and no intervening code change. The later delivery
commit adds only documentation/evidence; Hub R2 identifies its exact SHA.

| Formal run | Local capture ID | Suite seconds | UI / exact stored row |
| --- | --- | --- | --- |
| 1 | run-20260926-110718 | 134.020 | PASS / PASS |
| 2 | run-20260926-110950 | 135.220 | PASS / PASS |

Both independently started with the same fixture recipe: a newly created
confirmed synthetic account, a newly published synthetic product, zero existing
rating rows, app clearState and the anonymous login gate. No inherited rating
or authenticated session is used. Distinct product IDs and exact input hashes
are in [repeatability.json](repeatability.json). The runner refuses fixtures
that already contain a rating. No account deletion or DB reset occurs.

Both runs exercised anonymous Browse/search → Product Detail → Rate login gate
→ real password login → Not Now → all ten dimensions at 0.5 → Save → My Rating 5
→ app stop/launch → My Rating 5 → edit Appearance to 1.5 → Save → My Rating 6
→ second stop/launch → My Rating 6 and edit-form Appearance 1.5. Each run then
queried only its local user/product row and verified exactly one row, all ten
dimensions, sneaker-10-v1 and composite 6.

| Environment | Status |
| --- | --- |
| iOS Simulator, iPhone 18 Pro / iOS 27.0 | pass |
| Mobile web | not-run |
| Physical device | not-tested |

## Password diagnosis and bounded selector repairs

The initial order-only diagnostic run passed in 134.452 seconds, including
all ten dimensions, save, restart/readback, edit, second restart/readback and
the local database check. This trial ran on an uncommitted candidate and does
not count toward the two committed formal repeats above.

One subsequent run at `36ce4aae92d0f9778b2994e13f96a79235552f62` failed
at the stricter My Rating `childOf` selector after save. The card-ancestry
selector did not match the native tree. The bounded selector fix adds only the
invisible `my-rating-score` testID and asserts that identifier plus exact text.
Formal repeats restarted after this fix. The helper also now records
database-verification failure as failed, covered by an offline fault-injection
test; this closes the independent review's nonblocking evidence finding.

At `c13b294331f21164123c497bf32307d27ce60eab`, one complete run passed
(149.774 seconds including suite overhead), then the next fresh-fixture run
failed before login at product-card scrolling. The failure tree contained the
exact enabled product node and the screenshot showed it; timed scrolling over
the retained growing synthetic catalog was unreliable. A flow-only correction
uses the existing Search products field with the fixture SKU, then waits for
and taps the exact product testID. Formal consecutive repeats restarted
on the commit containing this correction; the earlier isolated PASS is not
counted toward that requirement.

The dismissal wait ran at 10:53:24.994, saw Not Now at 10:53:29.116, located an
enabled accessibility element, and the tap completed at 10:53:30.414.
The exact escaped Save Password absence assertion, post-login CTA and rating
controls passed. Classification: **dismissal succeeded**. This is neither
an unexecuted close step nor an inaccessible system window nor a failed tap.
Maestro selected by visible text; no authored coordinate selector was used.

Stage 1 succeeded before its 15-minute cap. Stage 2 was unnecessary and skipped.
No simulator or host setting changed; restoration requires no action.
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
synthetic account/product, zero rating rows and app clearState. The R1 native
binary was reused with Metro serving the tested JavaScript revision. Its only
app change is one invisible score testID. Both formal runs used:

```sh
python3 scripts/maestro-local.py fixture
JAVA_HOME=/Users/tysonhu/Library/Java/JavaVirtualMachines/openjdk-21.0.2/Contents/Home python3 scripts/maestro-local.py run --maestro /tmp/t-0003-maestro/maestro/bin/maestro --device B5343C0A-1D6E-4FA5-9C7D-B201CD0B38D0
```

## Validation and proof set

Independent integrated review approved the helper/flows; its one nonblocking
DB-failure-summary finding was fixed and covered by an offline regression.
Final read-only verification passed 2 offline tests, 59 infrastructure tests,
26 secret-check tests and the repository secret scan on the exact tested SHA.
The full `EXPO_NO_DOTENV=1 npm run check:readonly` passed at
`c13b294331f21164123c497bf32307d27ce60eab`; unchanged TypeScript, lint, wrapper
and decision inputs reuse that result. Affected graph/security checks were
rerun at the final tested SHA. No check failure remains.

Versioned proof: run-01/report.xml and run-02/report.xml; their summary.json and
dialog-events.json; repeatability.json; diagnostic-run.xml; three selected
screenshots (01 dismissed dialog, 02 restarted My Rating 5, 03 edited/restarted
My Rating 6). Dialog excerpts establish that the close step ran, Not Now was
visible and located, the tap completed, the modal disappeared and the business
CTA was usable in both formal runs. The full successful flows prove subsequent
interaction. Bounds in diagnostic output are Maestro-resolved geometry,
not authored coordinate selectors. No sleep or waitForAnimationToEnd was added.
All other raw captures/logs and private fixtures remain ignored local artifacts.

Project PR/hosted CI are separate delivery observations recorded in Hub R2 and
the PR checks on its exact head. No new CI/EAS/Cloud gate was added. The existing
Database CI path filter is unaffected. Local validation is not hosted CI proof.

Only one invisible app testID changed; no application behavior, dependency,
auth/API/data contract, CI or cloud change.
Staging, production, real users, physical devices, Android and web not exercised.
No merge, deployment, human acceptance or Project #4 write; Task 22 stays Pending.
Selected evidence contains only sanitized XML, summaries and decisive
non-authentication screenshots; private fixtures and raw artifacts stay ignored.

This smoke guards public browsing, the login gate and rating save/edit persistence.
It covers real native UI, local Auth/API calls and stored local database values.
It does not establish Android, physical-device, hosted auth/email, production
RLS, third-party password-manager/AutoFill configurations or release readiness.
