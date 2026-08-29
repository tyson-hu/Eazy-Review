# Blocker — task-19-iphone-mirroring-control — 2026-08-29

## Problem

H1 against reviewed SHA `5171d0373f5414ad3f2bcda87653b9dd1577946c` cannot
complete the required Browse → Account → confirmation → keyboard → transient
input → Cancel walk. The physical Debug build for that SHA cleaned and
compiled successfully, and `com.tysonhu.eazyreview.dev` is installed, but the
device remained locked so launch failed. Separately, this Cursor session has
no Computer Use / `@oai/sky` `node_repl` bridge, so even after unlock the
agent cannot drive iPhone Mirroring pointer actions for the Account-tab path.

## Attempts so far

### Earlier preflight (historical head `f64cb3d`)

1. Cleaned/rebuilt, installed, launched after unlock; Metro bundled; mirroring
   showed anonymous Browse.
2. Computer Use `sky.click` on Account returned
   `Sky Computer Use native pipe closed before response`.
3. Bundle-id refresh and keyboard `Tab` did not reach Account.

### 2026-08-29 H1 attempt on `5171d03`

1. Confirmed local/PR head `5171d0373f5414ad3f2bcda87653b9dd1577946c`.
2. `xcodebuild … clean`: **CLEAN SUCCEEDED**.
3. `npx expo run:ios --device "Tyson Hu’s iPhone" --port 8082`: **Build
   Succeeded** (0 errors, one non-failing Expo Dev Launcher warning), then
   `Cannot launch … because the device is locked`.
4. Confirmed installed app id `com.tysonhu.eazyreview.dev` via `devicectl`.
5. Polled `devicectl device process launch` for ~90s: every attempt returned
   locked / request denied. No Account UI, sign-in, Cancel, or delete action.
6. Started Metro `expo start --dev-client --port 8082` (waiting on
   `http://localhost:8082`).
7. Searched this Cursor session for Computer Use / Sky tools: none available
   (`node_repl` / `@oai/sky` are Codex Computer Use only). Paper desktop MCP
   discovery is in error. No silent substitute (deep link, AppleScript, or
   invented device automation) was used.

## Ruled out

- Wrong SHA: work ran on `5171d03`.
- Native compile failure: clean and Debug build succeeded.
- Missing install: `Eazy Review` / `com.tysonhu.eazyreview.dev` is present.
- Product UI defect: Account/confirmation never reached.

## Evidence

```text
** CLEAN SUCCEEDED **
› Build Succeeded
CommandError: Cannot launch EazyReview on Tyson Hu’s iPhone because the device is locked.
Unable to launch com.tysonhu.eazyreview.dev because the device was not, or could not be, unlocked.
```

## Environment facts

- Reviewed branch/head: `codex/task-19-guarded-account-deletion` at
  `5171d0373f5414ad3f2bcda87653b9dd1577946c`.
- Physical target: paired iPhone 17 Pro Max (`available (paired)`).
- iPhone Mirroring process was running on the Mac; pointer control was not
  available to this agent session.
- Metro may still be listening on port 8082 after the attempt.

## Next hypothesis

1. Unlock the physical iPhone (and keep it unlocked) so launch can succeed.
2. Complete H1 either with a Computer Use-capable session that can drive
   iPhone Mirroring, or by human-driving Browse → Account → confirmation →
   keyboard → transient input → Cancel while the agent records evidence.
3. Never substitute a deep link for Account, and never submit
   `Delete my account`.

## Resolution (2026-08-29)

Human completed H1 after the Account keyboard remediation. Result:
**tested-pass** (working tree). Historical keyboard-occlusion fail on
`5171d03` remains in Task 19 evidence. Agent iPhone Mirroring pointer control
is still unavailable in this Cursor session; that limitation no longer blocks
H1. See
`docs/evidence/task-19-protected-account-deletion/RESULT.md`.
