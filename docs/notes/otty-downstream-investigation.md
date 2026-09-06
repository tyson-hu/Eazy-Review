# Otty downstream investigation

Status: Investigation complete for the current disabled configuration on
2026-09-05. Retain hooks and leave Auto Approve disabled. The enabled approval
engine is untested; this is an explicit retained limitation, not a claim that
all Otty approval paths have been verified. No configuration changes proposed.

## Current installed behavior

Otty 1.4.1 (`io.appmakes.otty`) bundles readable Codex and Claude hook wrappers.
The earlier eight recorder-based wrapper tests passed. Those tests did not
contact Otty. This follow-up inspected the running application, packaged
settings UI, supported CLI, and a real isolated hook-to-app interaction.

Settings → Agents shows installed Claude/Codex/OpenCode hooks and Cursor hooks
off. Otty detects Codex at `/opt/homebrew/bin/codex`; this is distinct from the
modern app-bundled Codex used for the earlier routing probes. No installation,
agent executable setting or hook registration was changed here.

The packaged settings UI describes Auto Approve as deprecated and hides its
section unless `showAutoApprove` is enabled. The feature uses a separate AI to
review tool requests, with separate rules/provider controls. These descriptions
establish intended UI behavior, not the binary's full decision implementation.
The normal running Agents page did not display that section. Searching for
Auto Approve found its setting, but selecting the hidden result displayed no
control; we did not toggle visibility or enablement to force access.

Supported CLI readback (`otty-cli config get <key>`) returned:

| Key | Value |
| --- | --- |
| `auto-approve-enabled` | `false` |
| `show-auto-approve` | `false` |
| `ipc-allow-send-keys` | `false` |
| `ipc-allow-sensitive-sessions` | `false` |

`config path` identifies `~/.config/otty/config.toml`, rather than the macOS
preferences plist inspected earlier. The earlier absence of plist keys was
therefore insufficient evidence. Only the four relevant values and file hashes
were recorded; no full configuration or credentials were printed or published.

## Executed synthetic observation

A new Otty window ran a parent-authored Python recorder in a temporary working
directory. It asserted Auto Approve and IPC send-keys were disabled before
proceeding. The recorder invoked the installed Codex hook with its own PID, a
unique `otty-audit-…` session ID, and a synthetic PermissionRequest describing
`printf 'OTTY_AUDIT_ONLY\n'`. No real agent or command executor backed the request.
The recorder captured terminal input as bytes and never evaluated it.

Observed results:

- The hook exited 0 and produced no stdout decision.
- Live `otty-cli pane show --json` identified the dedicated pane as Codex,
  reported `agent_state: awaiting`, and matched the synthetic session ID.
  This establishes actual app receipt and pane association, beyond a stub test.
- The recorder received zero terminal input bytes during the 20-second window.
- The recorder sent the final idle lifecycle event and returned to the shell.
  The later saved pane snapshot had an empty agent state after completion.
- The dedicated test window was closed; the original window remained open.
- Otty config and Codex hook-registration hashes, the installed hook hash, and
  all four setting values were unchanged after the test.

This is evidence of receipt and no terminal-input approval for this synthetic
request during the observation window. It does not certify all payloads,
unobserved side channels, timing, real-agent permission handling, or the
behavior of the enabled AI approval engine. No provider request was initiated
by the test harness; network traffic was not instrumented.

Local evidence: `.codex/experiments/otty-downstream/` contains the reviewed
`probe.py`, `baseline.json`, `live-result.json`, `pane-observation.json`, and
`verification.json`. The live awaiting observation is in the task tool trace;
the saved pane snapshot was captured after the state cleared. Evidence files
contain synthetic data and scoped hashes; they are not repository deliverables.

## Disposition and reopening condition

Keep existing hooks and keep Auto Approve disabled. There is no demonstrated
need for a project code change, vendor patch, new hook, or expanded permission.
The current audit can carry the enabled path as an explicit untested boundary.
Do not describe Otty's hooks as necessarily cosmetic: the installed wrapper
forwards request context to an app that contains approval functionality.

Allow/deny/cancel testing of that functionality remains conditional on a future
request to enable or adopt it. Before doing so, establish an isolated app/profile
and provider boundary with no access to real working sessions; obtain explicit
approval for any setting that enables automatic approvals. Then observe actual
agent outcomes for each decision. This investigation does not authorize that
configuration change and did not execute simulated grants against this task.
