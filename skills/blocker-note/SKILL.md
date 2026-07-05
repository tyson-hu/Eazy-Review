# blocker-note

Goal: when debugging stalls, persist everything known about the problem into `docs/notes/blocker-<topic>.md` so a fresh session can attack it with clean context instead of repeating dead attempts.

When debugging stalls, the worst move is to keep chatting in the same overloaded session — attempts get repeated, context gets noisier, and eventually nobody can say what was already tried.

## When to use

Write a blocker note when any of these occur:

- The same problem failed 2+ times (this is the global retry-policy stop in `docs/LOOP_ENGINEERING.md`).
- Debugging has run 20–30+ minutes with no progress.
- Context is messy: the agent re-asks answered questions or repeats mistakes that were already corrected.
- The agent loops: plan A → plan B → back to plan A, or endless "try again" without a new hypothesis.

## When not to use

- First or second fix attempt of a fresh failure: follow `skills/bugfix-debug-loop` or the in-loop retry policy — no note yet.
- The blocker is a missing credential or a needed human decision, not a technical unknown: stop and report per the global stop conditions; a note is optional.

## Inputs expected

- The exact failing behavior or error, verbatim.
- The list of attempts made so far (what was changed, what happened).

## Read first

- The layer doc for where the problem lives (`docs/DESIGN.md`, `docs/API_CONTRACTS.md`, or `docs/DATA_MODEL.md`).
- The debugging principles in `docs/LOOP_ENGINEERING.md` — they apply before and after the note.

## Routine

1. Stop attempting fixes the moment a trigger above fires. More same-session attempts make the note harder to write, not easier.
2. Write `docs/notes/blocker-<topic>.md` (short kebab-case topic, e.g. `blocker-expo-doctor-versions.md`) with exactly these sections:

```md
# Blocker — <topic> — YYYY-MM-DD

## Problem

## Attempts so far

## Ruled out

## Evidence

## Environment facts

## Next hypothesis
```

3. Fill the sections with these rules:
   - **Problem** — one or two sentences, the observed vs expected behavior.
   - **Attempts so far** — one line per attempt: hypothesis, change made, result. Number them.
   - **Ruled out** — causes that are proven wrong, with the proof. This is what saves the next session from repeating work.
   - **Evidence** — exact error messages, command output, and versions, verbatim. No paraphrasing.
   - **Environment facts** — anything about timing, cache, network, registry, or machine state that affects reproduction.
   - **Next hypothesis** — the single most promising unexplored cause, or `Unknown — re-read <doc> first`.
4. Run the memory step below.
5. Recommend a fresh session (or a human decision) and stop. If the session is also at a natural boundary, run `skills/session-handoff` and link the blocker note from Current blockers.

## Writing rule: facts in files, not prose in chat

A chat-only diagnosis like "the difference is timing and npm cache state — the registry published patch bumps between when your lockfile was generated and now" is exactly the kind of finding that gets lost. In the note it must become durable facts:

```md
## Ruled out
- Check logic difference: both environments installed expo-doctor@1.20.0; same version, same checks.

## Environment facts
- Registry published patch bumps for expo, expo-constants, expo-router,
  expo-splash-screen after package-lock.json was last generated, so the
  "expected" versions moved up. Failure depends on npm cache freshness.
```

If a future session cannot verify or falsify the sentence, it does not belong in the note.

## Verification

- The note exists, has all six sections, and every attempt made in this session appears in Attempts so far.
- A reader with zero session context could avoid repeating every failed attempt using the note alone.

## Stop conditions

- This skill is itself a stop action: after the note is written, do not resume fix attempts in the same session.

## Memory step

- The note itself is the session-state memory: `docs/notes/blocker-<topic>.md` per the memory rule in `docs/LOOP_ENGINEERING.md`.
- Update `docs/TASKS.md` so the blocked task points at the note.
- Resolution is owned by the fixing loop: when the blocker is later cleared (normally via `skills/bugfix-debug-loop`), that loop deletes the note and removes the `docs/TASKS.md` pointer, or marks the note resolved if the record is still useful.

## Common mistakes

- Writing the note after "just one more try" — the extra attempt is usually the loop restarting.
- Paraphrasing errors instead of pasting them verbatim.
- Listing attempts without their results, so the next session cannot tell what was disproven.
- Putting the real insight in the chat summary but not in the note.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`; What changed names the blocker note file.
