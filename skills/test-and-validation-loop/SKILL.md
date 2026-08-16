# test-and-validation-loop

Goal: run the narrowest project checks for a finished change, fix only failures the change caused, and report the rest.

## When to use

- A change is done and needs validation before handoff, commit, or PR.
- Someone asks to "run the checks" or interpret failing check output.

## When not to use

- Do not use this skill as the PR-wide outer orchestration loop for checks run
  inside PR remediation.
- A failure is pre-existing (present without the current change): record it in `docs/TASKS.md` and leave it for `skills/bugfix-debug-loop` as its own task.
- No change is in flight and the goal is fixing a known bug: use `skills/bugfix-debug-loop`.

### When used inside PR remediation

Run command selection, failure classification, and caused-by-change repair with
this routine's normal limits. `skills/pr-review-remediation` retains finding
disposition, epoch authority, scope, and the terminal verdict.

## Inputs expected

- The change being validated (diff or description) — needed to classify failures.

## Read first

- The Validation Commands section in `docs/AGENT_WORKFLOW.md` (what each command covers).

## Routine

1. Apply the validation trust gate in `docs/AGENT_WORKFLOW.md` before any
   command. Untrusted or unreviewed trees run only in exact-SHA disposable,
   credential-free isolation — never on the agent host or via sandbox
   escalation. "Read-only" describes intended file effects, not code safety.
2. Pick the narrowest read-only command first: a focused test ->
   `npm run typecheck` -> add `npm run lint` -> `npm run check:readonly` for the
   complete non-mutating verifier gate. The verifier never runs route/config
   preparation or the parent-owned Expo gate.
3. When route/config preparation is required, the parent runs
   `npm run prepare:routes` first and confirms tracked drift. The parent also
   owns `npm run check:expo` / `npm run check`; host or out-of-sandbox execution
   requires a completed trusted-base review.
4. Run the selected read-only command. If everything passes, run the memory
   step and finish.
5. Classify every failure as `caused-by-change`, `pre-existing`,
   `environmental`, or `uncertain`. A changed file or line is only a lead; it
   is not direct causation evidence. Use an error that identifies newly added
   behavior, a focused regression, a bisectable line-level mechanism, or an
   equivalent before/after result as direct evidence.
6. If a clean-base comparison would settle an uncertain result, the parent
   creates a temporary worktree or uses another explicitly safe comparison.
   Never stash automatically, and never ask a read-only verifier to change the
   checkout.
7. Fix only directly evidenced `caused-by-change` failures, smallest fix first.
   Maximum 2 retries per failure, then stop and report (the global retry policy
   in `docs/LOOP_ENGINEERING.md`). A read-only verifier reports the failure to
   the parent instead of performing this step.
8. Record each pre-existing failure in `docs/TASKS.md` as discovered work. Do
   not fix it now, even if it looks quick. A read-only verifier reports the
   item; the parent owns the document edit.
9. Re-run the failed command until clean of caused-by-change failures, then run
   the memory step.

## Verification

- The chosen commands pass, or every remaining failure is classified with
  direct evidence and routed to the parent.
- The final report names each command run, its result, and each skipped broader command with the reason.

## Stop conditions

- Only pre-existing failures remain: stop and report; the change is validated.
- A failure lacks direct causation evidence: classify it as `uncertain`, stop,
  and report the evidence needed rather than guessing.
- An untrusted tree has no disposable, credential-free exact-SHA environment.

## Memory step

- Add pre-existing failures to `docs/TASKS.md` as new task items with the exact
  error text after redacting secrets, credentials, tokens, personal data, and
  private notes.
- No decision record; validation runs are not decisions.

## Common mistakes

- Running `npm run check` for a two-line type edit when `npm run typecheck` answers in seconds.
- Asking a read-only verifier to run `prepare:routes`, `check:expo`, or the full
  parent-owned `check` command.
- Treating a failure in a changed file as caused by the change without direct
  evidence.
- Automatically stashing user work instead of asking the parent for a safe
  clean-base comparison.
- Fixing a tempting pre-existing failure and turning validation into an unscoped bugfix.
- Retrying a third variation after two failed fixes instead of stopping.
- Reporting "checks pass" without naming which commands actually ran.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
