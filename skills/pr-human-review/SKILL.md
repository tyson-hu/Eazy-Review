# pr-human-review

Goal: review one implementation-complete pull request for human acceptance by explaining what it changes without requiring a line-by-line code review, then separating product and behavior decisions from deterministic automated verification.

## When to use

- A pull request is implementation-complete and the user asks what they should personally review or whether it is ready for human acceptance.
- The user needs a technical PR translated into understandable consequences, tradeoffs, and manual scenarios.
- Review work must be split into: (1) behavior, product, risk, or sequencing choices only a human can accept, and (2) behavior unit tests, CI, or other automated checks can prove.

## When not to use

- Existing review findings require current-head triage, root-cause
  deduplication, or remediation: use `skills/pr-review-remediation`. Return
  here after remediation and current-head verification when human acceptance
  remains pending.
- The request is only to run or interpret project checks: use `skills/test-and-validation-loop`.
- The request is to interactively verify a journey in a simulator or mobile-web preview: use `skills/interactive-preview-loop`; cite that evidence here when it already exists, but do not launch the preview loop from this skill.
- A known defect must be fixed: use `skills/bugfix-debug-loop`, or fix a caused-by-change validation failure inside `skills/test-and-validation-loop`.
- The user asks for a general line-by-line code review rather than an acceptance decision guide.
- This skill does not replace automated validation or interactive testing. It consumes their results for a human acceptance decision.

## Inputs expected

- Repository and pull request number or URL.
- The task, acceptance contract, or product goal the PR claims to complete.
- Any user priorities already stated, such as simplicity, offline behavior, security tolerance, or delivery order.

## Read first

- `AGENTS.md` and the current task in `docs/TASKS.md`.
- The live PR head, description, changed-file list, checks, review comments, and unresolved threads.
- Only the contracts needed for the changed areas from the context map in `docs/AGENT_WORKFLOW.md`.
- `docs/SECURITY.md` when the PR touches credentials, authorization, personal data, session storage, destructive behavior, or external environments.

## Routine

1. Resolve the live PR and record its current head SHA, draft and mergeability state, changed files, latest checks, requested reviews, and unresolved threads. Do not rely on an earlier head or chat summary when GitHub can be read.
2. Find the acceptance contract in `docs/TASKS.md`, the PR body, and the relevant product or architecture documents. State what the PR is supposed to complete and what remains deliberately out of scope.
3. Inspect the highest-risk patches first: security and authorization, user-visible failure modes, data loss or isolation, lifecycle cleanup, configuration boundaries, and task-scope completeness. Do not read generated files or lockfiles line by line unless their generation or dependency decision is itself under review.
4. Explain the task in ordinary language before listing review items: what changed, what users should notice, what should stay the same, and what CI currently says.
5. Classify every meaningful concern:
   - **Human-only:** whether the behavior, tradeoff, risk, scope, sequencing, or real user experience is desirable.
   - **Automated:** deterministic correctness that a unit test, integration test, static check, build, export, or CI job can prove.
   - **Mixed:** split desirability from correctness. For example, ask the human whether missing configuration should stop startup, while tests prove that it fails with the documented error and does not leak credentials.
6. Write **Part 1 — Things only you should decide** with the three to seven highest-value decisions. For each decision, explain as needed:
   - **What this changes:** the visible or operational consequence.
   - **Try this:** a short real-device or real-workflow scenario for the human to perform only when actual experience matters. Do not treat this as a request to run `interactive-preview-loop`.
   - **You are deciding:** the product, behavior, risk, or sequencing choice.
   - **Recommendation:** one clear recommendation for the current project stage.
   - **Accept when:** the simple human acceptance condition.
   Keep engineering detail where it helps, but translate terms on first use and never require the user to understand implementation line by line.
7. Write **Part 2 — Automated/unit-test review**:
   - **Already verified:** important deterministic behavior supported by current-head tests or CI, naming the evidence when known.
   - **Missing or weak coverage:** only meaningful gaps, why they matter, and whether each blocks acceptance.
   - **Automated review conclusion:** verified, mostly verified with non-blocking gaps, or blocked.
   Do not generate a Cursor prompt, test-writing prompt, or patch unless separately requested.
8. End with a direct recommendation: ready for human acceptance, ready after a small automated follow-up, or not ready. Name the remaining human decisions and any automated blocker separately.
9. Keep GitHub read-only unless the user explicitly authorizes the exact write action. Never mark ready, approve, request reviewers, edit the PR body, or merge as a side effect of the review.

## Verification

- The report is based on the current PR head and current-head checks.
- The quick overview explains the task without assuming line-by-line code knowledge.
- Part 1 contains only decisions automation cannot make for the human.
- Part 2 contains deterministic behaviors that tests or CI can prove, with evidence or clearly labeled gaps.
- Mixed concerns are split into a human desirability question and an automated correctness check.
- Facts, recommendations, and dependency-path or runtime inferences are clearly distinguished.
- Security, privacy, authorization, data-loss, and secret-handling risks are considered before lower-risk maintainability observations.
- No GitHub write occurred without explicit authorization.
- The report does not claim human acceptance until the user explicitly accepts the behavior.

## Stop conditions

- The repository or PR cannot be identified: ask for the repository and PR number or URL.
- The PR head changes during review: refresh the changed files and checks before concluding.
- Required checks are pending or unavailable: report the uncertainty; do not call the PR verified.
- The acceptance contract is missing or contradictory: stop and ask which contract is authoritative.
- A high-risk area cannot be inspected with available access: identify the missing evidence and do not recommend acceptance for that area.
- The review turns into implementation, debugging, or interactive preview work: stop and route to the matching skill.

## Memory step

- This review is read-only by default; do not edit task status, decisions, notes, or PR metadata merely because a recommendation was produced.
- If the human explicitly accepts the task, report the exact task-status or PR-state update that is now appropriate. Apply it only after explicit authorization and through the workflow that owns that change.
- Add or update a `docs/decisions/*.md` record only when the human acceptance establishes a durable high-impact behavior or risk decision under `docs/decisions/README.md`; routine PR acceptance is not an ADR.

## Common mistakes

- Asking the human to verify a typed error, singleton identity, listener cleanup, or CI command that a focused test should prove.
- Hiding a product choice inside a technical statement, such as treating fail-fast startup or unencrypted session storage as automatically correct.
- Giving a generic checklist unrelated to the actual PR.
- Making the user inspect generated types, lockfiles, or thousands of lines instead of explaining consequences and high-risk changes.
- Treating a stale PR description as proof of current implementation.
- Saying a dependency is unreachable with certainty when only the dependency path was inspected.
- Generating an implementation prompt when the user asked only for the review report.
- Running the check suite or an interactive preview walk inside this skill instead of citing existing automated or interactive evidence.
- Editing the PR, task status, or merge state after recommending acceptance unless the user explicitly authorized that exact write.

## Human-readable handoff

Use this report structure for the review itself:

1. Human acceptance review: PR title or task.
2. Quick overview.
3. Part 1 — Things only you should decide.
4. Part 2 — Automated/unit-test review.
5. Final recommendation.

If an explicitly authorized repository or GitHub write occurs after the review, append the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) from `docs/AGENT_WORKFLOW.md`.
