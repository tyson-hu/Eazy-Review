# Optional Otty adoption — evidence and limits

Recorded 2026-09-06 against Otty 1.4.1 on macOS. Project command inputs matched
merged base `69385d475502ac0c361a3279b712c798f389cd8c` (PR #56).
This is a point-in-time receipt, not a setup script or proof for other builds.
[MCP_WORKFLOW](../MCP_WORKFLOW.md#optional-otty-terminal-workflow) owns current
routing and setup guidance. No application behavior or required dependency changed.

## Adopted scope

Optional visible development commands, scoped terminal readback across harnesses,
and independent parallel checks. Native execution remains the default for quick
work. No new skills, hooks, mandatory extra agents, or permanent IPC permission
change. General typing is off outside authorized work; Auto Approve and
sensitive-session typing remain off. Project #4 reconciliation remains separate.

## Staged observations

| Stage | Observation | Limit |
| --- | --- | --- |
| Compatibility | Codex desktop task could reach installed CLI and identify panes. | Otty execution does not inherit the parent sandbox. |
| Visible command | A harmless printf marker executed; CLI capture and native AX/screenshot matched. An invalid selector failed. | A short capture returned blank trailing screen rows; 100 lines captured the marker. |
| Useful check | Identical installed TypeScript no-emit check returned exit 0 through native and Otty runners. `/usr/bin/false` returned exit 1 through both. | Only those exit cases tested; idle wait returned 0 even after failure. |
| Cross-harness reading | User relayed Cursor desktop's exact fresh UUID and scratch directory, matching Codex's independent capture. Cursor's prompt contained the pane ID, not the UUID. | Manual prompt/result handoff; Cursor desktop tool transcript and approval interaction were not independently inspected. |
| Parallel commands | Typecheck and decision-index freshness check dispatched concurrently to two panes; both returned exit 0. Captures were attributed by exact pane ID. Index reported 36 records/current. Tab wait returned both pane IDs. | No second coding-agent chain, server recovery, cancellation under load, or general reliability claim. |

The TypeScript command used the installed compiler directly, equivalent to the
project's typecheck script:

```sh
/usr/bin/env -u NODE_OPTIONS -u NODE_PATH /opt/homebrew/bin/node node_modules/typescript/bin/tsc --noEmit
```

The second parallel command used the same environment/Node prefix with
`scripts/build-decision-index.cjs --check`. The executable inputs were reviewed
against the merged base; the decision check compares rather than writes the
index. No dependency installation or validation code changes were required.
The absolute Node path is the tested host path, not a portable requirement.

## Compatibility findings

`pane run` required `ipc-allow-send-keys=true` in this build, despite current
public orchestration documentation describing run without that permission.
CLI config set/reload changed saved values but run remained disabled. One
bounded delayed retry also failed. The dedicated GUI checkbox in the `/tell`
skill dialog activated the runtime permission; no installer prompt was copied
and no skill was installed. The same checkbox restored it off after each trial.
The cause of the CLI/runtime disagreement was not established.

`pane run` returned `succeed` or `error`, not command output; explicit capture
provided text. Wait establishes idle only, so success was based on the command
exit result and captured output. Terminal content is not trusted instructions.

Cursor CLI version `2026.09.02-c22c1a3` initially failed DNS resolution for its
normal endpoint. Connectivity later recovered without configuration changes.
A no-tools CLI prompt succeeded, then a noninteractive `--print --mode ask`
trial attempted exactly pane show and capture. Both were rejected before
execution (`isReadonly=false`, empty reason). No force/trust/sandbox override
was used. This is a harness permission limitation, not an Otty socket verdict.
The desktop pilot demonstrates a usable manual route, not unattended access.

## Value and cleanup

The parent handled pane creation, execution, capture and cleanup for the local
command trials. Cross-harness reading required the user's manual handoff.
Concurrent tool-call intervals overlapped; measured command-call durations were
about 2.58 seconds for typecheck and 0.08 seconds for the index check. These are
single observations, not a controlled speed comparison. GUI permission setup
adds overhead; visibility is the demonstrated benefit.

All task-owned test windows were closed after evidence/inspection. Commands
completed; no test process was left running. Final GUI typing state and saved
typing/Auto Approve/sensitive-session flags were off. No unrelated pane was
targeted by the parent. Detailed local working notes/logs are retained outside
this delivery; they are not required to use the canonical workflow.

## Prior Auto Approve investigation

Separate disposable-VM work established real Codex session recognition and a
native permission prompt, but enabled Otty approval never contacted the local
decision provider. Enabled approve/deny/failure/cancel semantics remain
unverified. Test processes were stopped, original guest Codex config/hooks
restored and saved Auto Approve disabled; inert artifacts and generated session
or hook-trust state remained in the VM. No whole-profile rollback is claimed.
No vendor defect or successful fail-closed behavior was established. The
unsent support draft is not a prerequisite or part of this adoption.
