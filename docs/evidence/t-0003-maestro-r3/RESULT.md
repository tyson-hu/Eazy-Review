# T-0003 revision 3 — security gate and Comfort interaction

Hub contract: revision 3 at 022ec13fb1c009621c98b867469c9cd386e405ba,
STATE 13, decision T-0003.D2 REWORK. Project base:
f71a1d90aaa7367359104fcaffa848afd6b30093. Recovered local R2 result:
99828a60dc8df003c26fa3dcc70a3e1b6464b2e2. PR #63 remains Draft.
Outcome: ready_for_review. Both final committed full runs and database readbacks
passed; this is an execution report, not human acceptance or merge permission.

## Final committed results

Final tested code: 762944111491c1730cbb98d9655e74c191eb5db0.
The containing result commit adds only evidence/documentation after that code.

| Run | UI result / time | Local database readback |
| --- | --- | --- |
| run-20260926-183515 | PASS / 126.059 s | PASS, one matching row |
| run-20260926-183731 | PASS / 115.606 s | PASS, one matching row |

These were consecutive complete runs at the same committed SHA and fixed
simulator/backend configuration, with distinct fresh account/product fixtures
and zero-rating preconditions. A final scoped database check confirms two
distinct user fingerprints and products; see database-readback.json. Both runs
retain all original save, restart, readback, edit and second-restart assertions.

Final local check:readonly, three credential-free regressions and diff checks
pass. Expo validate run 36279910939 passes at the final tested code; Draft
CodeQL remains skipped. Code/security reviews are bound to f9568c5 and 5c01cf8,
not silently attributed to later commits. P1 is resolved; P2 was resolved after
7629441's deletion fix, CLI rejection proof, checks and full repeats, with reply
[4113386233](https://github.com/tyson-hu/Eazy-Review/pull/63#discussion_r4113386233).
There were no same-root new security findings. No extra review cycle followed
that narrowly verified deletion fix.

Environment matrix: iOS Simulator **pass**; mobile web **not-run**; physical
device **not-tested**. Implemented, locally tested and pushed to existing Draft
PR #63; merged **no**, deployed **no**, user accepted **not yet**. Task 22 remains
Pending and Task 23 was not started. Proposed Project #4 writes: none.
Task-owned Metro, simulator and dedicated Supabase are stopped; volumes retained.
Technical work started 23:05:08 UTC; final UI/DB proof obtained before 23:40 UTC,
within the 45-minute total and 30-minute Phase 2 limits. No further UI retries.

## P1 gate

The old d9816a5 denylist was reproduced with placeholder credentials, never real
host credentials. f9568c5a1f37b3c1c94486f46f611a6358dd1f04 replaced the recovered
common allowlist with per-tool minimal allowlists and explicit fixture fields.
See [SECURITY.md](SECURITY.md) for the variable matrix and trusted-base review.
Three offline tests inspect subprocess.run and mocked Maestro Popen boundaries,
including DATABASE_URL, PGPASSWORD, AWS_ACCESS_KEY_ID, mixed-case npm _authToken,
unknown credentials, proxies and runtime injection variables. All passed.

Local check:readonly and Expo validate 36278536680 passed at f9568c5. Codex code
review completed at 23:12:02 UTC and security review at 23:14:07 UTC without new
findings. The P1 thread was resolved with evidence reply
[4113285453](https://github.com/tyson-hu/Eazy-Review/pull/63#discussion_r4113285453)
before Phase 2 began at approximately 23:15:30 UTC. No Maestro was run before
this hard gate. CodeQL was skipped for Draft status, not reported as passing.

## Diagnosis and smallest change

The initial split prepared-screen probe and a Comfort-only combined probe passed.
They did not reproduce R2's preceding-row state and were not treated as stability
or full-flow proof. A bounded reproduction then kept the five prior unsaved
half-step inputs from R2 and stopped immediately after Comfort; it did not run
save/restart/edit. At 99a3631ad77167db3c407a0d812d517970b92c41 it failed in 67.670 s.

The log shows an already fully visible row at y=594, height 125. Extra centering
swiped it to y=82, partially beneath the native navigation header. Maestro's
screen-level visibility check still returned 100%. The enabled increment's
bounds were [300,141][339,179], and Maestro reported the stabilized in-bounds
tap (319,160). Its command completed, but the strict assertion failed and the
post-tap hierarchy still said `Comfort, not rated`; the bounds stayed unchanged.
This establishes a viewport-dependent native hit-target boundary, despite a
matched selector and stable hierarchy. It does not prove a wrong selector or
a moving coordinate, and does not identify the internal UIKit/RN responder cause.

The controlled change toggled only Comfort's `centerElement` from true to false.
The same R2-context probe passed at 1efa5b30f11a3b4ff1f068560105aff1fb6120ae:
the target remained in the unobscured content area and one tap produced exactly
0.5. The shared `comfort-half-step.yaml` then passed twice at
5c01cf8c2a3f30bc1893a781b97e3f76e124982e: 45.852 s and 46.121 s, each with a new
account/product and zero rating rows. In the second pass its increment bounds
were [300,672][339,710], tap (319,691), followed by `Comfort, 0.5 of 10`.

Only Comfort's unnecessary centering is disabled in the complete journey;
other dimension steps retain their existing behavior. There is no added sleep,
retry, relaxed assertion, coordinate tap, product change or new identifier.
Before/after hierarchies, command slices and two selected screenshots are stored
alongside this report. `runs.json` preserves all diagnostic outcomes and SHAs.

## Review correction and verification boundary

The first complete pair at 5c01cf8 passed UI and database checks. A subsequent
code review found P2 comment
[4113370964](https://github.com/tyson-hu/Eazy-Review/pull/63#discussion_r4113370964):
the standalone diagnostic entry could attribute an old screen to a new fixture.
The qualifying context probes and complete runs each included real preparation;
the unsafe reusable entry was nevertheless removed, rather than adding state.

At 762944111491c1730cbb98d9655e74c191eb5db0 the CLI accepts only `critical-flow`
and `comfort-check`. Both clear app state, open the fixture's exact product and
perform real login in the same run. The removed `comfort-micro` option exits 2
at argument parsing. Its two standalone YAML files were deleted. Security
review at 5c01cf8 completed without findings at 23:35:08 UTC. No claim is made
that that review inspected the later deletion commit. The unchanged Comfort
helper and full flow are revalidated on the final runner commit below.

## Fixed environment and proof selection

Same iPhone 18 Pro, iOS 27.0, UDID B5343C0A-1D6E-4FA5-9C7D-B201CD0B38D0;
installed R2 development app com.tysonhu.eazyreview.dev reused. Maestro --version
confirmed 2.10.0, using the existing Java 21.0.2 runtime. Dedicated Supabase
project eazy-review-t0003 at http://127.0.0.1:55321, Metro 8087. Password/AutoFill
settings unchanged; real Not Now handling reused. Direct dependency versions
match package-lock.json. No installation, native rebuild or framework research.

Each full run creates a fresh disposable synthetic user and product; the runner
refuses any pre-existing rating. Each exercises anonymous Browse, product,
login gate, real login, rate/save, restart/readback, edit, restart/readback, then
verifies one local database row with Appearance=1.5, other nine dimensions=0.5,
methodology sneaker-10-v1 and composite 6. No fixture deletion or database reset.
Formal run summaries record the exact commit and tracked_tree_dirty=false.

Selected for GitHub: this report, security/validation summaries, curated
run summaries/JUnit/Comfort command slices, trimmed Comfort hierarchy JSON,
and three screenshots (failure, corrected half-step, edited restart readback).
Full sanitized raw debug files remain private under .maestro/.local. No fixture
credentials, auth screenshots, public env file or full raw history are uploaded.
Historical split-probe precondition wording is explicitly clarified in runs.json.

This smoke catches regressions in public browsing, the login gate and durable
rating save/edit/readback. It exercises real native UI with local Auth/API/DB.
It cannot promise physical-device, Android, hosted auth/email, production RLS,
release safety or all password-manager configurations.
