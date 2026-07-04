# test-and-validation-loop

Goal: run the narrowest project checks for a finished change, fix only failures the change caused, and report the rest.

## When to use

- A change is done and needs validation before handoff, commit, or PR.
- Someone asks to "run the checks" or interpret failing check output.

## When not to use

- A failure is pre-existing (present without the current change): record it in `docs/TASKS.md` and leave it for `skills/bugfix-debug-loop` as its own task.
- No change is in flight and the goal is fixing a known bug: use `skills/bugfix-debug-loop`.

## Inputs expected

- The change being validated (diff or description) — needed to classify failures.

## Read first

- The Validation Commands section in `docs/AGENT_WORKFLOW.md` (what each command covers).

## Routine

1. Pick the narrowest command first: `npm run typecheck` -> add `npm run lint` -> `npm run check` (adds typed-route generation, `npx expo-doctor`, `npx expo install --check`). On a clean checkout run `npm run generate:routes` before typecheck.
2. Run it. If everything passes, run the memory step and finish.
3. For each failure, classify: caused by the current change, or pre-existing? Verify by checking whether the failing file/line is in the current diff, or by stashing the change and re-running if fast.
4. Fix only caused-by-change failures, smallest fix first. Maximum 2 retries per failure, then stop and report (the global retry policy in `docs/LOOP_ENGINEERING.md`).
5. Record each pre-existing failure in `docs/TASKS.md` as discovered work. Do not fix it now, even if it looks quick.
6. Re-run the failed command until clean of caused-by-change failures, then run the memory step.

## Verification

- The chosen commands pass, or every remaining failure is classified pre-existing and recorded.
- The final report names each command run, its result, and each skipped broader command with the reason.

## Stop conditions

- Only pre-existing failures remain: stop and report; the change is validated.
- A failure cannot be classified after inspecting the diff: stop and report it as unclassified rather than guessing.

## Memory step

- Add pre-existing failures to `docs/TASKS.md` as new task items with the exact error text.
- No `docs/DECISIONS.md` entry; validation runs are not decisions.

## Common mistakes

- Running `npm run check` for a two-line type edit when `npm run typecheck` answers in seconds.
- Fixing a tempting pre-existing failure and turning validation into an unscoped bugfix.
- Retrying a third variation after two failed fixes instead of stopping.
- Reporting "checks pass" without naming which commands actually ran.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
