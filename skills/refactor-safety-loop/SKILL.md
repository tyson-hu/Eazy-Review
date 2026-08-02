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
3. Choose the focused read-only checks that cover the affected code. Run them
   before editing and save the results as the comparable baseline; a delegated
   refactor agent may include `npm run check:readonly` but never route/config
   preparation or the full Expo gate.
4. When the refactor affects routes, dependencies, Expo configuration, or a
   handoff that requires the full Expo gate, the parent captures the
   pre-refactor `npm run check:expo` baseline outside the sandbox. The parent
   performs any required `npm run prepare:routes` and records tracked config
   drift; delegated agents receive those results rather than running the
   parent-owned commands.
5. Refactor in small moves within the allowed list. Route file names under `app/` and public component props stay unchanged; import paths keep the `@/` alias convention.
6. Re-run the same focused read-only checks after the refactor and compare with
   the baseline — same passes, same directly evidenced pre-existing failures,
   nothing new.
7. Walk the affected screens once (whichever of Feed / Browse / Product Detail / Rating Form / Account import the moved code).
8. When step 4 required a full baseline, the parent runs the final
   `npm run check:expo` outside the sandbox and compares it with the
   pre-refactor result.
9. Run the memory step.

## Verification

- The same focused read-only command set was run before and after, with
  matching passes and no new failures; `npm run check:readonly` is the broadest
  delegated-agent gate.
- When a full Expo baseline was required, the parent's final
  `npm run check:expo` result matches the pre-refactor baseline.
- Route names and public props verifiably unchanged (`git diff` shows no `app/` route file renames, no prop-type changes).
- Screen walk shows identical behavior.

## Stop conditions

- Any behavior difference appears, even a beneficial-looking one: stop and revert or report; behavior changes need their own task.
- The refactor needs to touch a file outside the declared allowed-files list.

## Memory step

- Update `docs/TASKS.md` only if the refactor completes or unblocks a listed task.
- Add or update a `docs/decisions/*.md` record only if the structure choice is durable and high-impact under `docs/decisions/README.md` (for example, a repository-wide folder convention); update `docs/API_CONTRACTS.md` if the documented folder structure changed.

## Common mistakes

- "While I'm here" fixes folded into the refactor.
- Renaming route files under `app/`, which silently changes URLs.
- Changing a component's props "for cleanliness," breaking consumers the typecheck cannot see (spread props, navigation params).
- Skipping the before-baseline, making the after-check unprovable.
- Asking a delegated refactor agent to run `prepare:routes`, `check:expo`, or
  the full parent-owned `check` command.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
