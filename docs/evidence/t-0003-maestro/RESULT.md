# T-0003 — blocked Maestro critical-flow candidate

Observed 2026-09-26, America/Chicago, by local Codex. Contract:
`tyson-hu/dispatch-hub@d21ea166e644478f192aee6121601128f51e3c68`, STATE 9,
T-0003 revision 1. Project base and unchanged native app source:
`f71a1d90aaa7367359104fcaffa848afd6b30093`. Work branch:
`codex/t-0003-maestro`. Candidate files are preserved in the commit containing
this report. Runtime trials preceded that commit; there is **no exact committed
SHA with a passing full flow**. `candidate-manifest.json` binds the final failing
flow files by SHA-256. No product source, auth/API/data contract, or testID changed.

## Outcome and stop condition

A1 passes at feasibility scope: CLI ran real UI commands on the current build;
MCP inspected the real app and performed interactions/assertions. A2 fails:
the complete save/restart/readback/edit journey never passed. The task stopped
around 10:20 (start around 09:51), within its 75-minute budget, because the same
native Save Password modal recurred after its one permitted repair. This is a
flow synchronization/order failure, not evidence that Maestro lacks the required
platform capability. No alternate framework was attempted.

| Environment slot | Status |
| --- | --- |
| iOS Simulator | fail |
| Web preview | not-run |
| Physical device | not-tested |

| Component | Observed version / target |
| --- | --- |
| Maestro | CLI 2.10.0; bundled MCP server reports 1.0.0 |
| Java | OpenJDK 21.0.2 |
| Xcode | 27.0, build 27A266a |
| Device | iPhone 18 Pro, iOS 27.0, B5343C0A-1D6E-4FA5-9C7D-B201CD0B38D0 |
| Development app | com.tysonhu.eazyreview.dev; Expo 57.0.25, RN 0.86.3 |
| Host | Node 26.10.0, npm 11.19.1 (host differs from documented Node 24 CI) |
| Data | Supabase CLI 2.110.0, disposable eazy-review-t0003, API 127.0.0.1:55321 |

## Framework and trust evidence

The official release archive was verified against GitHub release asset metadata
and the official Homebrew formula; the Gradle launcher was read before execution.
Archive SHA-256:
`29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991`.
See [the setup record](../../../.maestro/README.md) for source links and commands.
No remote pipe-to-shell was used. Existing executable inputs were compared with
the trusted project base; `npm ci --ignore-scripts --no-audit --no-fund` installed
the existing lockfile. Native build succeeded with zero errors and one Xcode
run-script output warning. `simctl` and Maestro worked headlessly despite the
host lacking Simulator.app at the normal Xcode paths.

[`mcp-proof.json`](mcp-proof.json) preserves initialize and actual `run` results,
plus a documented excerpt of `inspect_screen`. The coding agent drove the
official server through stdio JSON-RPC, without a global Codex MCP configuration
change. It inspected Browse, tapped the synthetic product, asserted the login
gate, inspected Product Detail, then tapped the gate and asserted the email and
password fields. `run` returned success for 6 and 4 commands respectively
(counts include the app configuration command). No credentials were entered via
MCP. The [product screenshot](screenshots/01-mcp-product-detail.png) corroborates
the active app; hidden old dev-launcher error nodes in the full hierarchy were
excluded from the excerpt and were not the active screen.

## Failure reproduction and bounded diagnosis

Use the local-only setup and run command in [the runbook](../../../.maestro/README.md).
The final run used a new disposable confirmed account/product; `.env.local`
contained only the dedicated loopback API and its public anon key. No account
deletion, reset of another stack, staging, production, or real data was used.

1. Initial trial failed entering rating controls while the native password-save
   modal covered the screen. One repair added optional `Not Now` and a modal
   absence assertion after the post-login CTA assertion.
2. The next trial passed that point and asserted nine dimensions at 0.5. The last
   increment was under the fixed footer, so one selector repair added
   `centerElement: true`. That repair has not reached its verification point.
3. The next fresh-fixture run failed earlier: `rate-this-product` visibility was
   asserted while Save Password was present, before the optional dismissal.
   [`failed-run.xml`](failed-run.xml) records 51.355 seconds and one failed test;
   [the failure screenshot](screenshots/02-native-password-modal.png) confirms it.

No additional UI repair or rerun was made. An upstream-authorized next attempt
would need to handle the native modal before asserting the post-login CTA, then
evaluate the still-unverified footer centering and restart behavior. The current
regex `Save Password?` also treats `?` as a regex quantifier; it is not reliable
proof of exact modal absence and is preserved as part of the failing candidate.

All three full-flow trials failed. Saving, persisted rating verification,
restart/readback, editing, and repeatability remain unverified. Logs and private
fixtures remain ignored locally; only credential-free selected proof is tracked.
The initial trials are under `/tmp/t-0003-maestro/run-01` and `run-02`; the last
trial is `.maestro/.local/run-20260926-101558`. Temporary files are not durable
evidence; this directory contains the durable decision-relevant selection.

## Review, validation, and delivery boundary

Independent scoped review found one privileged-loopback request defect: default
Python proxy inheritance. The helper now installs `ProxyHandler({})` and retains
redirect rejection. A credential-free, network-forbidden regression probe passed.
This safety correction was made during evidence finalization; the blocked UI
candidate was not rerun or otherwise repaired. Final independent verification
and required project checks are recorded in `validation.md`.

The candidate is local-only: no business branch push, PR, CI run, merge,
deployment, EAS/cloud trigger, or user acceptance. Project #4 moves: none.
Task 22 remains Pending. Task 23 was not started.

The intended smoke guards the public-browse/login/rating persistence journey.
Actual evidence currently covers native UI navigation, login, and partial
dimension interaction against disposable local Supabase, plus real MCP control.
It cannot promise complete scoring persistence, physical-device/Android behavior,
hosted auth/email, production RLS, or release readiness.

Decision requested: authorize one additional bounded same-root repair attempt
for native password-modal ordering, retaining Maestro and all current boundaries.
