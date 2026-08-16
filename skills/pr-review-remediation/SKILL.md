# pr-review-remediation

Goal: close one explicitly accepted set of existing pull-request findings in
one frozen review epoch, or stop with the precise authority, scope, evidence,
validation, or human decision still required.

This skill is the outer control plane. It owns live PR state, epoch state,
finding provenance and dispositions, root-cause grouping, accepted scope,
remediation and review budgets, and the terminal verdict. Existing skills own
assigned implementation or validation routines; they never take over the PR
epoch. Shared retry, validation, memory, and handoff rules remain canonical in
`docs/LOOP_ENGINEERING.md`, `docs/AGENT_WORKFLOW.md`, and `docs/SECURITY.md`.

## When to use

Use when an existing Eazy Review PR already has automated, human, Codex,
security, or inline findings and needs current-head triage, stale/already-fixed
classification, root-cause grouping, remediation planning, or an explicitly
authorized remediation pass.

This repository-local skill stays outer even for read-only triage. Triage may
end without edits; remediation requires separate edit and scope authority. A
GitHub comment/thread handler is only an inner capability after scope is set
and cannot authorize edits, epochs, replies, resolutions, or other writes.

## When not to use

- First-pass code review or human product acceptance.
- A standalone bug, checks-only task, initial feature, refactor, device walk,
  or broad architecture/security audit without existing PR findings.
- Generic review-comment work outside an Eazy Review remediation context.
- Any merge, approval, comment, thread, label, reviewer, or PR-metadata write
  unless the user separately authorizes that exact action.

Route standalone work through the matching skill in `docs/LOOP_ENGINEERING.md`.
GitHub is read-only by default.

## Inputs expected

- Repository and PR number or URL.
- Local-checkout availability.
- Read-only triage versus explicit edit/scope authorization.
- Optional prior dispositions, finding IDs, or thread IDs.

Resolve available repository facts instead of asking the user to repeat them.
A severity threshold never authorizes suppressing a concrete high-impact defect.

## Read first

1. `AGENTS.md` and `docs/LOOP_ENGINEERING.md`.
2. Relevant validation/authority sections of `docs/AGENT_WORKFLOW.md`.
3. The live PR: actual head and base, changed files, description, comments,
   reviews, resolved and unresolved threads, and exact-head checks.
4. Only contracts relevant to the findings; include `docs/SECURITY.md` for
   auth, sessions, credentials, private data, destructive behavior, external
   environments, or production boundaries.

The PR body's SHA and thread resolution state are evidence inputs, not truth
about the current head or whether a root cause is fixed.

## Routine

1. **Confirm authority and live state.**
   - Record repository, PR, base, actual head, review sources, exact-head
     checks, and edit authorization.
   - If triage-only, do not edit the checkout. Keep GitHub read-only unless an
     exact write is separately authorized.
   - If the head moves during triage, refresh state before accepting any
     remediation set; stop if it cannot be refreshed.

2. **Freeze one review epoch.**

   ```text
   repository
   prNumber
   epochBaselineSha
   remediationStartSha
   remediationHeadSha
   reviewInputs:
     - source
       reviewedSha
   reviewBudgetUsed
   nextEpochAuthorization:
     status
     authorizedBy
     authorizedFromHead
     scope
     grantedAt
   openedUnderAuthorization
   ```

   - `epochBaselineSha` is the live head when initial triage freezes, not a
     claim that every source reviewed that head.
   - `reviewInputs` is a list/set of `{source, reviewedSha}`; exact duplicates
     may collapse, but older inputs remain and are re-evaluated on current head.
   - `remediationStartSha` freezes when the accepted fix set begins;
     `remediationHeadSha` advances after its primary pass. Fix commits do not
     create another epoch.
   - `nextEpochAuthorization.status` is `none | granted`, default `none`. A
     grant names `authorizedBy`, `authorizedFromHead`, and `scope`; `grantedAt`
     is optional and never inferred from risk, findings, or a remediation.
   - Opening the named next epoch records `openedUnderAuthorization`, consumes
     the grant, and resets pending authorization to `none`. It cannot be reused;
     a material head or scope change requires a fresh grant.

3. **Build one ledger entry per root cause.**

   ```text
   rootCauseId
   findings:
     - findingId
       source
       reviewSha
   reportedSeverity
   affectedFiles
   affectedInvariant
   concreteScenario
   impact
   currentHeadEvidence
   existingRegressionCoverage
   disposition
   acceptedAction
   owner
   ```

   Preserve `{findingId, source, reviewSha}` for every grouped finding and
   evaluate each against its own reviewed SHA, current head, and task contract.
   Group by violated invariant, not wording, reviewer, severity, or comment
   count. Allowed dispositions are `accepted-blocker`, `accepted-nonblocking`,
   `already-fixed`, `stale`, `duplicate-root-cause`, `out-of-scope`,
   `documented-follow-up`, `human-decision-required`, `insufficient-evidence`,
   and `not-reproducible`.

   Accept a general finding only when it is PR-introduced/materially exposed,
   reachable, concrete, relevant to correctness/security/privacy/data integrity
   or acceptance, not prevented, and not already covered. A lifecycle/race
   finding must identify state, operations, ordering, result, invariant, and
   why existing serialization/cancellation/provenance/stale-result guards fail.
   A security finding must identify preconditions, entry point, protected
   boundary, impact, missing/bypassed defense, and an evidence path. Always
   surface concrete account takeover, wrong-account/private-data mutation,
   auth bypass, identity mismatch, cross-user exposure, credential leakage,
   destructive loss, revocation error, production-boundary violation, or core
   acceptance-flow failure regardless of a P1/P2/P3 label.

   When findings share a lifecycle, cache, callback, navigation, transaction,
   or concurrency mechanism, map authoritative state, operations, ordering,
   cancellation, stale completion, event provenance, winning user action,
   fallback, and required regression coverage. Prefer the missing invariant
   over another special-case patch.

4. **Freeze the accepted remediation set before editing.**
   Record included and excluded/deferred root causes, exact file/contract
   boundary, assigned inner routine, regression evidence, validation commands,
   human/environment gates, and whether a targeted follow-up may be considered.
   Combine true duplicates and address causes. Do not edit before this set
   exists unless prior authority explicitly covers every qualifying blocker.
   Stop if the correction expands architecture, schema, product, task, or file
   scope; a review comment is not expansion authority.

5. **Assign inner routines without yielding outer ownership.**
   - `skills/bugfix-debug-loop`: reproduce and correct one accepted root cause.
   - `skills/test-and-validation-loop`: choose checks, classify failures, and
     apply its bounded caused-by-change repair; it cannot accept findings or
     authorize an epoch.
   - `skills/feature-slice-builder`: preserve task-mode contracts for an inner
     feature correction.
   - Use `supabase-schema-change`, `ui-screen-builder`,
     `product-data-modeling`, or `refactor-safety-loop` only when the accepted
     scope explicitly selects that domain routine.
   - Use `interactive-preview-loop`, `pr-human-review`, `session-handoff`, and
     `blocker-note` only at their documented evidence, acceptance, boundary,
     or exhausted-attempt triggers.

6. **Apply one primary remediation pass.**
   For each accepted cause, name the invariant, reproduce the concrete failure,
   make the smallest contract-preserving fix, add focused regression coverage,
   and verify affected neighboring behavior. Avoid unrelated cleanup,
   dependencies, renaming, or architecture. A code change alone is not proof;
   demonstrate the original failure and the corrected regression.

7. **Validate under the trust and repair budgets.**
   Before any PR-head command, classify `validationTrust` against a trusted
   base. Package scripts/hooks, tests, JavaScript configs, and validation inputs
   are executable.

   - `untrusted` or `not-established`: never execute on the agent host, with
     agent credentials, or through sandbox escalation. Use disposable,
     credential-free isolation pinned to the exact SHA and inspect results
     read-only.
   - `trusted`: host/out-of-sandbox execution is allowed only after reviewing
     every executable validation surface against the trusted base. Cache or
     permission errors and `strict-allow-scripts` do not establish trust.

   Follow `docs/AGENT_WORKFLOW.md`: focused regression, affected suite,
   typecheck/lint when relevant, affected generated/database checks,
   `npm run check:readonly`, then parent-owned Expo/environment validation when
   required. Record trust, base, execution environment, and passed/failed/
   pending/not-run/environment-owned evidence. Inspect exact-head CI; physical
   device work remains a human/interactive-preview gate.

   For each directly evidenced caused-by-change failure, allow at most two
   repairs. Before each, state one hypothesis, make one minimal correction, and
   rerun the narrow failure. Cosmetic variants do not reset the budget. After
   two failures, stop, preserve exact redacted evidence, and use/recommend
   `blocker-note`; do not open another review epoch.

8. **Classify post-remediation evidence without recursion.**
   - A true `duplicate-root-cause` adds no materially new current-head
     reachability, ordering, impact, failed-fix, guard-bypass, or regression
     evidence. Group it without another cycle.
   - If the same invariant is still concretely reachable on remediation head,
     keep/reopen `accepted-blocker`, mark remediation incomplete, report the
     evidence, forbid `COMPLETE`, and stop for an explicit decision. Do not
     auto-patch or auto-review it.
   - Use `already-fixed`/`stale` only from current code/test evidence, not thread
     state. Route distinct nonblockers to `documented-follow-up`; unsupported
     concerns to `insufficient-evidence`/`not-reproducible`.
   - A materially distinct concrete blocker stops the epoch with its evidence,
     impact, required scope, and owner; a new epoch needs fresh authorization.

9. **Enforce the follow-up review budget.**
   Default after validation is `no second review`. One targeted follow-up is
   allowed only when explicitly authorized and remediation materially changed
   auth, authorization, session ownership, data integrity, destructive or
   other high-risk behavior, or substantial new behavior. Limit it to the
   remediation diff, new code, directly affected neighboring invariants,
   remediation regressions, and touched high-risk boundaries. Record
   `reviewBudgetUsed: true`. Never restart the feature audit or review again
   automatically after fixing a targeted-review finding.

10. **Stop with exactly one terminal verdict.**

    ```text
    COMPLETE — accepted findings remediated and current-head validation passed.
    READY — triage complete; implementation authorization required.
    BLOCKED — human product or risk decision required.
    BLOCKED — remediation exceeds the authorized scope.
    BLOCKED — current-head validation or environment evidence is unavailable.
    BLOCKED — repair budget exhausted; blocker recorded.
    DEFERRED — remaining findings are nonblocking or owned by another task.
    ```

    `COMPLETE` is impossible while an accepted blocker has current-head evidence
    that its invariant remains reachable. Never use `CONTINUE`, end by asking
    for another full review, or silently open another epoch.

## Verification

- Live head/base, PR state, threads, and exact-head checks were resolved.
- Triage made no edit without explicit edit/scope authority.
- Epoch baseline, multi-source review inputs, remediation heads, and one-shot
  authorization/consumption are recorded.
- Every ledger root preserves each finding's ID/source/review SHA and applies
  the general/lifecycle/security quality bars.
- The accepted set preceded edits; outer ownership and inner routing held.
- Validation used an allowed trust environment and respected the two-repair
  budget; follow-up review/new epoch never occurred implicitly.
- Redundant comments were deduplicated, but failed-remediation evidence stayed
  blocking and could not produce `COMPLETE`.
- No GitHub write occurred without authority for that exact action.
- Exactly one approved terminal verdict is reported.

## Stop conditions

- Repository, PR, head, accepted set, or required authority cannot be resolved.
- Head changes during triage and live state cannot be refreshed.
- A human product/risk decision or unauthorized scope expansion is required.
- High-risk/current-head/environment evidence is unavailable.
- An untrusted head lacks exact-SHA disposable, credential-free isolation.
- A distinct blocker appears after remediation or two repair attempts fail.
- `session-handoff` or `blocker-note` reaches its documented trigger.

## Memory step

- Do not persist epoch authorization in task status, decisions, notes, PR
  metadata, comments, threads, or other repository memory.
- Use `session-handoff` only at a real boundary and `blocker-note` after the
  repair budget is exhausted.
- Update tasks or decisions only when a separate canonical contract and edit
  authority require it; routine finding closure is not an ADR.

## Common mistakes

- Counting comments instead of grouping root invariants and provenance.
- Trusting PR-body SHA, thread state, severity, or reviewer identity as truth.
- Editing before the accepted set or outside its authority.
- Letting an inner routine own PR state, scope, review budget, or verdict.
- Treating sandboxing, install controls, or green CI as code trust or human
  acceptance.
- Auto-patching failed remediation, fixing distinct nonblockers, or recursively
  running another review.
- Writing to GitHub without exact action authority.

## Human-readable handoff

Use the five sections in `docs/AGENT_WORKFLOW.md`. Include: repository/PR/base;
epoch baseline, remediation start/head, review inputs, edit authority, CI,
review budget, and next-epoch status/by/from/scope/consumption; each root cause
with every finding's ID/source/review SHA, invariant, scenario, evidence,
disposition, action, and owner; accepted/excluded scope and inner routines;
changes and regressions; validation trust/base/environment and all outcomes;
remaining decisions; and exactly one terminal verdict.

Keep GitHub read-only unless a later instruction authorizes an exact write.
