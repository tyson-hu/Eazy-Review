# bugfix-debug-loop

Goal: fix one reported bug with the smallest change that makes the reproduction pass, without rewriting surrounding code.

## When to use

- A reported defect in existing behavior: wrong data shown, broken navigation, crash, incorrect score display, form validation failure.
- A database, tooling, CI, script, dependency, configuration, or command-level
  defect in an existing repository contract.
- A pre-existing failure that was recorded in `docs/TASKS.md` during validation and is now its own task.

## When not to use

- Do not use this skill as the PR-wide outer orchestration loop for an accepted
  root cause inside an active PR-remediation epoch.
- The failure was caused by the change you are currently validating: fix it inside `skills/test-and-validation-loop` (max 2 tries) instead.
- The "fix" is really a restructure of working code: use `skills/refactor-safety-loop`.

### When used inside PR remediation

For one assigned accepted root cause, run this reproduction-driven routine and
its retry limits normally. `skills/pr-review-remediation` retains ownership of
the epoch, accepted set, scope, review budget, and terminal disposition.

## Inputs expected

- The observed wrong behavior and the expected behavior.
- Where it happens (screen, route, or command) — for example "Browse search returns nothing for valid SKU `DD1391-100`".

## Read first

- For a user-visible defect: the affected flow in `docs/USER_FLOWS.md`, plus
  the layer contract (`docs/DESIGN.md` for UI behavior,
  `docs/API_CONTRACTS.md` for data shapes, or `docs/DATA_MODEL.md` for database
  behavior).
- For a database, tooling, CI, configuration, or command defect: the canonical
  contract for the affected surface and the Validation Commands section in
  `docs/AGENT_WORKFLOW.md`. Do not read unrelated product flows.

## Routine

1. Select the regression branch and explain its dependency in one sentence:
   - **User-visible defect:** name the affected flow from
     `docs/USER_FLOWS.md` and the nearest dependent flow that consumes or
     follows the affected behavior.
   - **Database, tooling, CI, configuration, or command defect:** name the
     affected contract, command, or validation surface and its nearest
     dependent check or integration boundary. Never force an unrelated
     Browse -> Detail -> Rating walk.
2. Reproduce first. Record the exact steps or command (route taps such as
   Browse -> `/product/[id]`, or exact check output). When a focused test
   harness exists, run its narrowest relevant regression test before any
   broader command. Preserve exact evidence after redacting secrets,
   credentials, tokens, personal data, and private notes. No reproduction, no
   fix.
3. Write the hypothesis down before editing: one sentence naming the suspected
   cause (first debugging principle in `docs/LOOP_ENGINEERING.md`).
4. Apply the minimal fix for that hypothesis only. Do not clean up, rename, or
   restructure while fixing.
5. Re-run the reproduction and the focused regression test, when one exists;
   confirm the wrong behavior is gone.
6. Complete the selected branch: exercise both user flows when supported, or
   re-run the focused command reproduction and the selected dependent check or
   integration boundary for a non-user-flow defect.
7. Run verification, then the memory step.

## Verification

- The recorded reproduction no longer occurs.
- The narrowest relevant regression test passes when a harness exists.
- `npm run typecheck` and `npm run lint` when the changed layer requires them.
- The affected and nearest dependent user flows show no new breakage when the
  defect is user-visible and those flows can be exercised.
- For a database, tooling, CI, configuration, or command defect, the focused
  reproduction and selected dependent validation surface both pass.

## Stop conditions

- Two failed hypotheses: stop and report both hypotheses, both attempted fixes,
  and the exact current behavior after redacting secrets, credentials, tokens,
  personal data, and private notes (this is the global retry policy in
  `docs/LOOP_ENGINEERING.md`).
- The fix wants to rewrite surrounding code (restructure a component, change a contract, touch schema): stop; that is scope growth, and the restructure needs its own task.

## Memory step

- Update `docs/TASKS.md`: mark the bug task done, and record any different pre-existing issues discovered along the way as new items (do not fix them now).
- If this bug has a related `docs/notes/blocker-*.md`, delete it and remove the `docs/TASKS.md` pointer after the blocker is resolved, or mark the note as resolved if the record is still useful.
- Add or update a `docs/decisions/*.md` record only if the fix introduced a durable high-impact contract or behavior decision under `docs/decisions/README.md`; a routine fix that restores the existing contract is not an ADR.
- In a delegated debugger run, report task-status, documentation, ADR, or
  blocker-note needs without editing them; the parent owns all memory work.

## Common mistakes

- Fixing the symptom on one screen when the cause is a shared type or util (`src/utils/`, `src/types/product.ts`).
- Editing before writing the hypothesis, then being unable to say why the fix works.
- Bundling drive-by cleanups into the fix commit scope.
- Defaulting to the whole Browse -> Detail -> Rating journey when the defect
  belongs to a command or integration boundary.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
