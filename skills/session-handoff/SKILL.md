# session-handoff

Goal: persist the working state of the current session into `docs/notes/handoff.md` so the next session can continue without re-reading old transcripts.

Principle: chat is the workbench; files are the hard drive. For long tasks, loops, and cross-day collaboration, state must never live only in chat — the next session reads files, not transcripts.

## When to use

Recommend a new session (and write this note) when a session boundary is reached:

- A feature phase is complete.
- A bug is fixed and the next task is unrelated.
- Backend work is done and the next work is UI.
- Exploration is done and implementation is next.
- The session is overloaded: context is noisy, answers repeat, or earlier corrections are being forgotten.

At a boundary, stop adding work to the current session. Either the user asks for a handoff or the agent proposes one itself — both end in this routine.

## When not to use

- Mid-loop with a healthy session and no boundary reached: just keep working.
- Debugging is stalled and the problem itself is the blocker: use `skills/blocker-note` instead (a handoff can link to the blocker note).
- The task is finished and nothing continues into another session: the five-section Human-readable handoff from `docs/AGENT_WORKFLOW.md` is enough on its own.

## Inputs expected

- The current task (from `docs/TASKS.md` or the user's request) and its spec or issue link if one exists.
- The actual session state: files touched, commands run, results seen.

## Read first

- `git status --short` and `git diff --name-only` for the true list of changed files.
- The current task entry in `docs/TASKS.md`.

## Routine

1. Stop adding work. Do not start "one more small thing" past the boundary.
2. Write `docs/notes/handoff.md` (overwrite any previous handoff) with exactly these sections:

```md
# Handoff — YYYY-MM-DD

## What we are doing

## Spec or issue link

## Files changed

## Tests run and results

## Current blockers

## Next recommended step
```

3. Fill every section from evidence, not memory: files changed comes from git, tests run comes from actual command output. If a section is empty, write `None` — do not delete the section.
4. If a blocker note exists for this work, link it from Current blockers instead of restating it.
5. Run the memory step below.
6. Tell the user it is time for a new session and give them the resume prompt verbatim:

```txt
Read AGENTS.md, the spec, and docs/notes/handoff.md.
Continue from the previous session, but restate the plan before editing.
```

The next session reads `AGENTS.md`, the spec, and `docs/notes/handoff.md`, then restates the plan before editing anything (resume rule in `docs/AGENT_WORKFLOW.md`). The handoff file stays in place until the next boundary overwrites it.

## Verification

- `docs/notes/handoff.md` exists, has all six sections, and a reader with zero session context could pick up the work from it alone.
- Files changed matches `git status --short`.

## Stop conditions

- None beyond the global list — this skill is itself a stop-and-persist action.

## Memory step

- The handoff file itself is the session-state memory: `docs/notes/handoff.md` per the memory rule in `docs/LOOP_ENGINEERING.md`.
- Update `docs/TASKS.md` with the current task's status and any newly discovered follow-up work.
- Add a `docs/DECISIONS.md` entry if the session made a meaningful decision that is not yet recorded.

## Common mistakes

- Writing the handoff from memory instead of from `git status` and real command output.
- Vague next steps ("continue the feature") instead of one concrete action ("wire `useProductRatings` into `app/product/[id]/index.tsx`").
- Leaving key diagnosis in chat prose instead of the note — if it took effort to figure out, it goes in the file.
- Continuing to add work after the boundary because the session "still works".

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`, in addition to the `docs/notes/handoff.md` file.
