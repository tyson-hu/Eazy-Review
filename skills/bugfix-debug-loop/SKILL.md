# bugfix-debug-loop

Goal: fix one reported bug with the smallest change that makes the reproduction pass, without rewriting surrounding code.

## When to use

- A reported defect in existing behavior: wrong data shown, broken navigation, crash, incorrect score display, form validation failure.
- A pre-existing failure that was recorded in `docs/TASKS.md` during validation and is now its own task.

## When not to use

- The failure was caused by the change you are currently validating: fix it inside `skills/test-and-validation-loop` (max 2 tries) instead.
- The "fix" is really a restructure of working code: use `skills/refactor-safety-loop`.

## Inputs expected

- The observed wrong behavior and the expected behavior.
- Where it happens (screen, route, or command) — for example "Browse search returns nothing for valid SKU `DD1391-100`".

## Read first

- The affected flow in `docs/USER_FLOWS.md`.
- The doc for the layer the bug lives in: `docs/DESIGN.md` for UI behavior, `docs/API_CONTRACTS.md` for data shapes, `docs/DATA_MODEL.md` for database behavior.

## Routine

1. Reproduce first. Record the exact steps or command (route taps like Browse -> `/product/[id]`, or `npm run typecheck` output). No reproduction, no fix.
2. Write the hypothesis down before editing: one sentence naming the suspected cause.
3. Apply the minimal fix for that hypothesis only. Do not clean up, rename, or restructure while fixing.
4. Re-run the reproduction; confirm the wrong behavior is gone.
5. Regression-check the adjacent flow: walk Browse -> Product Detail -> Rating Form and back.
6. Run verification, then the memory step.

## Verification

- The recorded reproduction no longer occurs.
- `npm run typecheck` and `npm run lint`.
- The Browse -> Product Detail -> Rating Form walk shows no new breakage.

## Stop conditions

- Two failed hypotheses: stop and report both hypotheses, both attempted fixes, and the current behavior verbatim (this is the global retry policy in `docs/LOOP_ENGINEERING.md`).
- The fix wants to rewrite surrounding code (restructure a component, change a contract, touch schema): stop; that is scope growth, and the restructure needs its own task.

## Memory step

- Update `docs/TASKS.md`: mark the bug task done, and record any different pre-existing issues discovered along the way as new items (do not fix them now).
- Add a `docs/DECISIONS.md` entry only if the fix changed a contract or documented behavior.

## Common mistakes

- Fixing the symptom on one screen when the cause is a shared type or util (`src/utils/`, `src/types/product.ts`).
- Editing before writing the hypothesis, then being unable to say why the fix works.
- Bundling drive-by cleanups into the fix commit scope.
- Skipping the regression walk because the fix "obviously" only touches one screen.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
