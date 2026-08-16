# pr-review-remediation

Goal: close one explicitly accepted set of existing pull-request review
findings against one frozen review epoch, or stop with a precise human, scope,
evidence, or validation decision.

This skill is the outer orchestration loop. It owns live PR state, the epoch
baseline, review-input provenance, current head, finding ledger, root-cause
grouping, accepted remediation set and scope, review budget, and stop decision.
It does not replace feature implementation, domain correction, standalone
debugging, check selection, interactive verification, human acceptance,
session handoff, or blocker persistence.

## When to use

Use only when all are true:

1. An existing pull request already has automated, human, Codex, security, or
   inline review findings.
2. The user asks to triage, address, fix, verify, or close those findings.
3. Current-head review state and finding history matter.
4. The work needs PR-wide triage or a bounded remediation cycle, not a
   first-pass review.

Examples:

- "Codex left findings on PR #40; triage and fix the valid ones."
- "Address the unresolved review threads on this PR."
- "Determine which comments are stale, duplicated, already fixed, or blocking."
- "Complete one bounded finding-fix pass and tell me when to stop."
- "The reviewer keeps finding another auth race; group the root causes and
  close one review epoch."

For an Eazy Review PR with existing findings, this repository-local skill is
the outer route even for read-only triage. Triage is mandatory and may be
terminal; remediation needs separate explicit edit and scope authority. A
GitHub comment/thread handler may be an inner capability only after scope is
set; it cannot authorize edits, epochs, replies, resolutions, or other writes.

## When not to use

- First-pass code or acceptance review.
- Human product acceptance.
- A standalone bug without PR-finding context, or generic debugging.
- Checks-only requests.
- Broad architecture or repository-wide security audits.
- Generic GitHub review-comment work outside an Eazy Review remediation context.
- Initial feature implementation.
- Simulator or physical-device verification by itself.
- Refactoring working code.
- Merge, approval, comment, resolve-thread, label, reviewer, or PR-metadata
  actions unless the user separately authorizes the exact write.

| Situation | Owner |
| --- | --- |
| First-pass human acceptance review | `skills/pr-human-review` |
| One standalone existing defect | `skills/bugfix-debug-loop` |
| Checks or failure classification | `skills/test-and-validation-loop` |
| Initial feature implementation | `skills/feature-slice-builder` |
| Simulator/mobile-web/device evidence | `skills/interactive-preview-loop` |
| Natural context boundary | `skills/session-handoff` |
| Exhausted repair attempts | `skills/blocker-note` |

GitHub is read-only by default.

## Inputs expected

- Repository and PR number or PR URL.
- Whether a local checkout is available.
- Whether edits are authorized or the task is read-only triage.
- Optional existing human dispositions, finding IDs, or thread IDs.
- Optional reporting preference.

Resolve information already available from the connected repository or current
checkout instead of asking the user to repeat it. A severity threshold is not
authority to suppress a concrete high-impact defect.

## Read first

1. `AGENTS.md`.
2. The current task in `docs/TASKS.md`, when one exists.
3. `docs/LOOP_ENGINEERING.md`.
4. The relevant parts of `docs/AGENT_WORKFLOW.md`.
5. The live PR: actual current head SHA, base branch, description, changed
   files, comments, submitted reviews, resolved and unresolved threads, and
   current-head workflow checks.
6. Only task-relevant product or engineering contracts.
7. `docs/SECURITY.md` when findings involve authentication, authorization,
   sessions, credentials, private data, destructive actions, external
   environments, or production boundaries.

Do not assume the PR body's claimed SHA is current. An unresolved thread is not
proof of a live defect, and a resolved thread is not proof that a root cause
was fixed correctly.

## Routine

1. **Confirm authority and live state.**
   - Record repository, PR number, base branch, actual current head, review
     sources, current-head checks, and edit authorization.
   - Keep GitHub read-only unless the exact write action is separately
     authorized.
   - If the task is triage-only, do not edit the checkout.

2. **Freeze one review epoch before classifying findings.**

   Record:

   ```text
   repository
   prNumber
   epochBaselineSha
   remediationStartSha
   remediationHeadSha
   reviewInputs:
     - source
       reviewedSha
   reviewedFindingIds
   findingRootCauses
   reviewBudgetUsed
   nextEpochAuthorization:
     status
     authorizedBy
     authorizedFromHead
     scope
     grantedAt
   openedUnderAuthorization
   ```

   - `epochBaselineSha` is the live PR head when initial epoch triage is frozen.
   - `reviewInputs` is a list or set of `{source, reviewedSha}` inputs; exact
     duplicates may collapse. Preserve each ledger entry's `source` and
     `reviewSha`, evaluate staleness/currentness against that SHA and the
     current head, and re-evaluate older findings instead of dropping them.
   - `remediationStartSha` is the live PR head when the accepted fix set begins.
   - `remediationHeadSha` is the head after the primary remediation pass.
   - `findingRootCauses` contains deduplicated causes, not comment count.
   - `reviewBudgetUsed` records whether an explicitly authorized targeted
     follow-up review occurred.
   - `nextEpochAuthorization.status` is `none | granted` and defaults to `none`.
     A grant names `authorizedBy`, `authorizedFromHead`, and `scope`; `grantedAt`
     is optional. Never infer it from remediation, findings, or review risk.
   - Opening the named next epoch records `openedUnderAuthorization`, consumes
     the grant, and resets pending authorization to `none`; it cannot be
     reused. A material head or scope change requires a fresh grant.
   - If the PR head changes during initial triage, refresh live state before
     accepting the fix set. Fix commits update the remediation head but do not
     create a new epoch or restart a full audit.
   - A later epoch requires explicit authorization and is justified only by a
     materially distinct concrete blocker, or a substantial high-risk change
     for which the parent explicitly requests another review.

3. **Build one ledger entry per root cause, not per comment.**

   Use:

   ```text
   rootCauseId
   findingIds
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

   Allowed dispositions:

   ```text
   accepted-blocker
   accepted-nonblocking
   already-fixed
   stale
   duplicate-root-cause
   out-of-scope
   documented-follow-up
   human-decision-required
   insufficient-evidence
   not-reproducible
   ```

   Group comments that describe the same violated invariant and preserve every
   finding ID under that root cause. Grouping collapses redundant comments, not
   materially contradictory evidence. Do not count increasingly narrow variants
   of one mechanism as independent progress. Validate every finding against the
   current head and task contract; neither lateness nor reviewer identity
   determines validity. Separate facts, inferences, recommendations, and human
   product choices.

4. **Apply the finding quality bars.**
   - A general finding qualifies only when it is introduced or materially
     exposed by the PR, reachable under documented behavior, concrete enough
     to name an exact failure, relevant to correctness, security, privacy,
     data integrity, or acceptance, not currently prevented, and not already
     proven by regression coverage. Style preferences, optional abstractions,
     and speculative refactors do not qualify.
   - For a race or lifecycle concern, require the initial principal/session/
     route/state, operation A, operation B or SDK event, exact ordering,
     resulting state, violated invariant, and why serialization, generation
     checks, cancellation, reconciliation, cleanup, provenance, or a stale-
     result guard does not prevent it.
   - For a security concern, require user or attacker preconditions, reachable
     entry point, protected asset or trust boundary, concrete impact, bypassed
     or missing defense, and a realistic reproduction or evidence path.
     Classify it as `vulnerability`, `correctness defect in security-sensitive
     code`, `defense-in-depth improvement`, or `accepted product tradeoff`.
     Do not reopen a human-accepted tradeoff unless this PR materially expands
     its threat surface.
   - Regardless of P1/P2/P3 labels, always surface a concrete in-scope account
     takeover; wrong-account password, profile, rating, or private-data
     mutation; auth bypass; bearer-session identity mismatch; cross-user
     private-data exposure; secret, token, or complete callback-URL leakage;
     destructive data loss; global revocation when local sign-out is intended;
     production-boundary violation; or core acceptance-flow failure.

5. **Collapse finding chains into an invariant map.**
   When two or more findings involve the same auth provider, lifecycle system,
   cache ownership mechanism, reconciliation path, callback processor,
   navigation stack, database transaction, or concurrency coordinator, pause
   comment-by-comment patching and record:

   ```text
   authoritative state
   participating operations
   serialization rule
   cancellation rule
   stale-completion rule
   event provenance rule
   which explicit user action wins
   failure fallback
   required regression matrix
   ```

   Ask: "Are these independent defects, or evidence that one root invariant is
   still missing?" Prefer the root invariant over another special case. Stop
   for scope authorization if the correction becomes an architecture rewrite,
   schema change, product redesign, or task expansion; a review comment does
   not authorize that expansion.

6. **Establish one accepted remediation set before editing.**
   Record accepted and rejected/deferred root causes, the exact edit boundary,
   the inner routine for each accepted cause, regression evidence, validation
   commands, human/environment gates, and whether a targeted follow-up review
   may be considered. Combine duplicates and address root causes.

   Do not edit before this set exists unless prior user authorization clearly
   approves fixing every qualifying in-scope blocker.

7. **Compose the existing inner routines while retaining outer ownership.**
   - `skills/bugfix-debug-loop` owns the reproduction-driven correction for one
     assigned accepted root cause; this skill retains the epoch, accepted set,
     scope, and final disposition.
   - `skills/test-and-validation-loop` owns check selection, failure
     classification, and bounded caused-by-change repair; it cannot accept
     findings or authorize another epoch.
   - `skills/feature-slice-builder` still governs task-mode contracts for an
     inner correction; this skill becomes outer owner once external findings
     need triage.
   - Explicitly use `skills/supabase-schema-change` for schema/RLS/grant/
     function/trigger corrections, `skills/ui-screen-builder` for a one-screen
     visual correction, or `skills/product-data-modeling` for frontend-only
     shape changes. A behavior-preserving restructure needs a separate
     `skills/refactor-safety-loop` scope decision.
   - Use `skills/interactive-preview-loop` only when real-journey or screenshot
     evidence is specifically required.
   - After remediation and exact-head validation, return to
     `skills/pr-human-review` only when human acceptance remains pending.
   - Use `skills/session-handoff` at a natural context boundary and
     `skills/blocker-note` after exhausted repair attempts or stalled
     debugging.

8. **Apply one primary remediation pass.**
   For each accepted root cause: name the invariant, choose the inner routine,
   form a concrete reproduction, apply the smallest contract-preserving fix,
   add focused behavioral regression coverage, and preserve neighboring
   accepted behavior. Avoid cleanup, renaming, dependencies, and unrelated
   architecture work. Update canonical documentation only when behavior or a
   contract actually changes.

   A code change is not proof of a fix. Establish the original failure,
   demonstrate the regression passes after correction, and verify directly
   affected neighboring behavior.

9. **Validate with the bounded repair budget.**
   Run, in order:

   1. Narrowest focused regression.
   2. Affected test file or suite.
   3. `npm run typecheck` when logic or types changed.
   4. `npm run lint` when relevant.
   5. Affected database or generated-contract check when relevant.
   6. `npm run check:readonly` on the final tree.
   7. Parent-owned Expo or environment validation separately when required.

   In Eazy Review, the parent owns `npm run prepare:routes` and runs
   `npm run check:expo` / `npm run check` outside the sandbox. Physical-device
   work remains a human or interactive-preview gate. Inspect current-head
   GitHub CI rather than inferring it.

   For each directly evidenced caused-by-change validation failure, permit at
   most two repair attempts. Before each, write one hypothesis, make one
   minimal correction, and rerun the narrow failure. Cosmetic symptom variants
   do not reset the budget. After exhaustion, stop editing, use or recommend
   `skills/blocker-note`, preserve exact redacted evidence, and return control
   without opening a new review epoch.

10. **Handle post-remediation findings without recursion.**
    - True duplicate: use `duplicate-root-cause` only when the report adds no
      materially new current-head reachability, ordering, impact, failed-fix,
      guard-bypass, or regression evidence. Group redundant wording under the
      existing root cause without starting another cycle.
    - Failed remediation of the same root cause: if current-head evidence shows
      the affected invariant remains reachable, keep or reopen it as an
      `accepted-blocker`, mark remediation incomplete, forbid `COMPLETE`, report
      the evidence, and stop for an explicit next decision. Do not auto-patch or
      auto-review it.
    - Fixed or stale: inspect current code/tests and use `already-fixed` or
      `stale`; an unresolved thread alone does not require code changes.
    - Distinct nonblocking issue: use `documented-follow-up` and route it to its
      owner; do not fix opportunistically.
    - Distinct concrete blocker: stop and report why it is materially distinct,
      why current guards/tests miss it, impact, required scope, and task
      ownership. Require explicit authorization for a new epoch.
    - Theoretical or unsupported concern: use `insufficient-evidence` or
      `not-reproducible`, name the missing evidence, and do not edit.

11. **Use the follow-up review budget only when explicitly authorized.**
    The default after successful validation is `no second review`. One targeted
    follow-up may occur only when the parent explicitly authorizes it and the
    remediation materially changed authentication, authorization, session
    ownership, data integrity, destructive behavior, another high-risk
    contract, or substantial new behavior.

    Limit it to the remediation diff, directly affected neighboring
    invariants, new code, remediation-created regressions, and high-risk
    boundaries directly touched. Do not restart the original feature audit.
    Record `reviewBudgetUsed: true`. Do not automatically review again after
    fixing a targeted-review finding; a materially distinct blocker returns
    for an explicit new-epoch decision.

12. **Stop with exactly one terminal verdict.**

    `COMPLETE` is forbidden while any accepted blocker has current-head evidence
    that its affected invariant remains reachable.

    ```text
    COMPLETE — accepted findings remediated and current-head validation passed.
    READY — triage complete; implementation authorization required.
    BLOCKED — human product or risk decision required.
    BLOCKED — remediation exceeds the authorized scope.
    BLOCKED — current-head validation or environment evidence is unavailable.
    BLOCKED — repair budget exhausted; blocker recorded.
    DEFERRED — remaining findings are nonblocking or owned by another task.
    ```

    Never use `CONTINUE`, end with "run another full review," or silently open
    another epoch.

## Verification

- The live current head and checks were resolved, not inferred from the PR body.
- One review epoch records its baseline, per-source reviewed SHAs, one-shot
  authorization state, and one ledger entry per root cause.
- Every accepted finding passes its applicable general, lifecycle, and
  security quality bar.
- One accepted remediation set existed before edits.
- The primary pass stayed within its file/contract boundary and has focused
  regression evidence.
- Validation names passed, failed, pending, not-run, and environment-owned
  evidence separately.
- No second review or new epoch occurred without explicit authorization.
- No accepted blocker with a currently reachable invariant was marked complete.
- No GitHub write occurred without authorization for that exact action.
- The result uses one approved terminal verdict.

## Stop conditions

- Repository, PR, or current head cannot be resolved.
- PR head changes during triage and live state cannot be refreshed.
- The accepted set or edit authority is missing.
- A finding needs a human product/risk choice.
- Remediation requires architecture, schema, product, task, or file-scope
  expansion without explicit authorization.
- High-risk code or required current-head/environment evidence is unavailable.
- A materially distinct blocker appears after remediation.
- Two repairs for one validation failure are exhausted.
- A session boundary or stalled-debugging trigger requires
  `skills/session-handoff` or `skills/blocker-note`.

## Memory step

- Do not update task status, decisions, notes, PR metadata, comments, thread
  state, or repository memory merely to persist epoch authorization.
- Use `skills/session-handoff` for a real session boundary and
  `skills/blocker-note` after the repair budget is exhausted.
- Propose task or decision documentation only when a separate current contract
  requires it, and apply it only within explicit edit authority. A routine
  review-finding closure is not an ADR.

## Common mistakes

- Treating every comment as a new defect instead of grouping root causes.
- Trusting the PR body's SHA, unresolved-thread count, severity label, or
  reviewer identity as disposition authority.
- Patching another state-machine branch without mapping the missing invariant.
- Editing before the accepted remediation set exists.
- Letting an inner bugfix or validation routine own PR-wide scope or review
  budget.
- Running another complete review after every fix commit.
- Fixing a distinct nonblocking issue opportunistically.
- Treating green CI as human acceptance or merge authorization.
- Writing, resolving, approving, or merging on GitHub without exact authority.

## Human-readable handoff

Use:

```markdown
# PR review remediation: [PR title]

## Review epoch

- Repository
- PR number
- Base branch
- Epoch baseline SHA
- Remediation start SHA
- Remediation head SHA
- Review inputs (source and reviewed SHA)
- Edit authorization
- Current-head CI
- Review budget used
- Next-epoch authorization status
- Authorized by (or N/A)
- Authorized-from SHA (or N/A)
- Authorized scope (or N/A)
- Consumed / not consumed

## Root-cause finding ledger

For each root cause:

- Root-cause ID
- Finding IDs
- Reported severity
- Affected invariant
- Concrete scenario
- Current-head evidence
- Disposition
- Accepted action
- Owner

## Accepted remediation set

- Included findings
- Excluded findings
- File/scope boundary
- Inner routines
- Regression requirements
- Validation plan

## Changes applied

For each accepted root cause:

- Smallest correction
- Affected files
- Focused regression
- Documentation impact

## Validation

- Passed
- Failed
- Pending
- Not run
- Environment-owned

## Remaining decisions or blockers

Only unresolved matters.

## Terminal verdict

One approved terminal verdict.
```

Keep GitHub read-only unless a later user instruction authorizes an exact write
action.
