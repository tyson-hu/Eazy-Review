# refactor-safety-loop

Goal: restructure code with zero behavior change, proven by identical checks before and after.

## When to use

- Moving files into the documented structure (`src/components/ui/`, `src/features/products/`, `src/features/ratings/`, `src/lib/`, `src/utils/`).
- Extracting a shared component or hook that removes real duplication.
- Renaming internals for clarity without touching public props or routes.

## When not to use

- Any intended behavior change, however small: that is feature or bug work — use `skills/feature-slice-builder` or `skills/bugfix-debug-loop`.
- Restructuring discovered mid-bugfix: finish or park the bugfix first; a fix that wants to rewrite surrounding code is a `skills/bugfix-debug-loop` stop condition, not a license to refactor.

## Inputs expected

- What to restructure and why (what duplication or confusion it removes).

## Read first

- `docs/API_CONTRACTS.md`: Recommended Frontend Folder Structure, and any contract covering the code being moved.

## Routine

1. Declare non-goals in writing: no behavior change, no visual change, no dependency change, no route change.
2. Write the allowed-files list before editing. Any file outside the list is out of scope.
3. Run `npm run check` before touching anything and save the result as the baseline.
4. Refactor in small moves within the allowed list. Route file names under `app/` and public component props stay unchanged; import paths keep the `@/` alias convention.
5. Re-run `npm run check` after; compare with the baseline — same passes, same (pre-existing) failures, nothing new.
6. Walk the affected screens once (whichever of Feed / Browse / Product Detail / Rating Form / Account import the moved code).
7. Run the memory step.

## Verification

- `npm run check` output matches the pre-refactor baseline.
- Route names and public props verifiably unchanged (`git diff` shows no `app/` route file renames, no prop-type changes).
- Screen walk shows identical behavior.

## Stop conditions

- Any behavior difference appears, even a beneficial-looking one: stop and revert or report; behavior changes need their own task.
- The refactor needs to touch a file outside the declared allowed-files list.

## Memory step

- Update `docs/TASKS.md` only if the refactor completes or unblocks a listed task.
- Add a `docs/DECISIONS.md` entry if the structure decision is durable (new folder convention, new shared component); update `docs/API_CONTRACTS.md` if the documented folder structure changed.

## Common mistakes

- "While I'm here" fixes folded into the refactor.
- Renaming route files under `app/`, which silently changes URLs.
- Changing a component's props "for cleanliness," breaking consumers the typecheck cannot see (spread props, navigation params).
- Skipping the before-baseline, making the after-check unprovable.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
