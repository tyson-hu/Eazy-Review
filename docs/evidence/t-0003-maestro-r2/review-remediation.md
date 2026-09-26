# PR 63 host-environment boundary

Source: [GitHub Codex P1](https://github.com/tyson-hu/Eazy-Review/pull/63#discussion_r4111958580)
on `d9816a5d34363788cf2630986a7376a8d92a6d32`; root cause host-env-inheritance.
Independent policy: default/base `f71a1d90aaa7367359104fcaffa848afd6b30093`,
unchanged AGENTS, SECURITY, AGENT_WORKFLOW and pr-review-remediation skill.
Execution trust: relevant executable inputs reviewed against that base; host
execution uses placeholder-only regression and the dedicated local stack.

Accepted P1: a case-sensitive denylist let unrelated DATABASE_URL, PGPASSWORD,
AWS_ACCESS_KEY_ID and mixed-case npm authToken variables reach external tools.
This violated the subprocess credential boundary. Existing proxy regression
covered HTTP forwarding only. A placeholder-only reproduction failed on all
four names plus an unknown future-provider credential; no real host credential
was read, printed or used in the reproduction. Actual prior exposure is unknown.

Primary correction: environment() allowlists PATH, HOME, temporary-directory
variables, JAVA_HOME, DEVELOPER_DIR and locale variables. It adds only explicit
local fixture/tool variables afterward. Unknown names are excluded by default.
The focused regression now passes. No framework, product, auth/API/data, provider,
dependency or CI change is involved. One primary repair, no failed repair.

The first fresh-fixture UI rerun after the environment fix failed at Comfort,
which remained not rated after its increment tap. The screenshot/hierarchy put
its label under the native header after centering the button alone. This is an
ordinary native selector/scroll issue within the user's explicit revision-2
permission for such repairs; no additional product authority is inferred from
the review comment. One bounded correction centers the whole dimension row
and requires the unrated value to be visible before tapping. Strict 0.5
postconditions remain; no timeouts, sleeps or product behavior changed.

The qualifying integrated baseline review is the GitHub Codex review on d9816a5.
No additional full review was requested. Final checks, two fresh-fixture complete
UI repeats and exact-head CI must be recorded before the remediation is COMPLETE.
The hosted thread is left for authorized upstream handling; no bot reply or
thread-resolution write is inferred from the finding itself.
