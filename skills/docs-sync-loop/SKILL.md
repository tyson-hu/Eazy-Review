# docs-sync-loop

Goal: bring drifted docs back in sync with the code that already changed, using pointers instead of duplicated explanations.

## When to use

- Docs have drifted from code after the fact: a past change shipped without its doc updates, or a review found stale content.
- A standalone docs cleanup task from `docs/TASKS.md`.

## When not to use

- Doc updates for a change you are making right now: every skill's own memory step covers those; this loop is only for after-the-fact drift.
- Product-direction rewrites of `docs/BLUEBOOK.md`: that is a scope decision for a human, not a sync task.

## Inputs expected

- `git diff --name-only <base>` output for the drifted change, or a named doc/section known to be stale.

## Read first

- `docs/DOCUMENTATION_POLICY.md`: the Document Update Map is this loop's routine table.

## Routine

1. List the changed files (`git diff --name-only`, or the stale docs named in the task).
2. For each changed file, find its row in the Document Update Map and list the affected docs.
3. Update each affected doc to match the code as it is now — status in `docs/TASKS.md`, contracts in `docs/API_CONTRACTS.md`, schema in `docs/DATA_MODEL.md`, flows in `docs/USER_FLOWS.md`.
4. Where content exists in its canonical home (see the Canonical Homes table in `docs/AGENT_WORKFLOW.md`), add a one-line pointer — never duplicate the explanation into a second doc.
5. Check every file path mentioned in the touched docs still exists (no dangling references to deleted or moved files).
6. Add missed `docs/DECISIONS.md` entries for decisions the drifted change made but never recorded.
7. Run the memory step.

## Verification

- Grep the touched docs for referenced file paths and confirm each exists in the repo.
- Re-read each updated doc top to bottom: no statement contradicts the current code or another doc.
- No explanation now lives in two places.

## Stop conditions

- Docs match code: the loop is done; do not keep polishing wording.
- The drift reveals the code itself contradicts `docs/BLUEBOOK.md` or `docs/DATA_MODEL.md`: stop and report — that is a product/schema conflict, not a docs bug.

## Memory step

- Update `docs/TASKS.md` if the sync completes a listed task or uncovers follow-up work.
- The doc updates themselves are the output; add a `docs/DECISIONS.md` entry only for newly recorded (previously missed) decisions.

## Common mistakes

- Copying an explanation into a second doc instead of pointing to its canonical home.
- Rewriting historical `docs/DECISIONS.md` entries because they mention deleted files — they are records; leave them.
- "Improving" doc prose that already matches the code (scope growth).
- Syncing the doc to what the code should be rather than what it is.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
