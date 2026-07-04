# skill-creator

Goal: turn a task pattern that has been explained repeatedly into one new skill in `skills/<name>/SKILL.md`, with a clear trigger, numbered steps, project-specific rules, and acceptance criteria — draft first, files after approval.

A skill is a reusable, parameterized workflow template for an agent. Chat instructions evaporate; skills persist. That persistence cuts both ways: a bad skill is worse than a bad prompt, because future agents keep following it.

## Approval gate (hybrid rule)

Agent proposes. Human approves. Agent implements after approval.

- Agents may proactively propose a new skill after the same task pattern, convention, or workflow has been explained 3+ times ("You have explained this same workflow 3+ times. This may deserve a skill.").
- Agents must not create, delete, merge, or substantially modify skill files without explicit human approval. Requires approval: creating a skill, deleting a skill, merging skills, changing a trigger, changing skill boundaries, adding `scripts/` or `templates/`, and editing the skill indexes in `AGENTS.md` or `docs/LOOP_ENGINEERING.md`.
- The human decides whether the workflow is common enough, whether it overlaps an existing skill, whether the trigger is too broad, whether it adds too much context, and whether it belongs in a skill at all — versus `AGENTS.md`, `docs/AGENT_WORKFLOW.md`, or just the current task.
- Skills share context with every other instruction: keep them concise and focused, capturing only specific, useful conventions.

## When to use

- The same task pattern has been explained at least three times across sessions (for example: the same conventions repeated for every new screen, every migration, every report).
- The user asks to turn repeated prompts into a skill, tune a skill's trigger description, or test a skill.
- Existing skills need maintenance: a step was skipped in practice, a convention was misunderstood, a new edge case appeared, or the library needs a periodic review.

Typical patterns worth capturing: add an API endpoint, create a database migration, write a recurring report, refactor a component into hooks, review a PR against team rules, fix lint errors and add tests.

## When not to use

- The pattern has occurred once or twice: keep it in chat; three repetitions is the threshold.
- The workflow already matches an existing skill: iterate that skill instead of creating an overlapping one (check the loop index in `docs/LOOP_ENGINEERING.md` first).
- The "skill" would be one-off business logic with nothing parameterized: that is a task, not a template.

## Inputs expected

- The repeated pattern: which past tasks followed it, and what conventions were restated each time.
- A short kebab-case name for the skill.
- What varies between uses (the parameters) versus what is fixed (the project rules).

## Read first

- `docs/LOOP_ENGINEERING.md` — loop anatomy (every skill needs trigger, goal, required context, routine, verification, stop conditions, memory, handoff) and the loop index, to confirm no trigger overlap.
- One existing skill (for example `skills/bugfix-debug-loop/SKILL.md`) as the structural reference.

## Repo skill structure

Every skill in this repo is two files, plus optional support folders:

```
skills/<name>/
├── SKILL.md            # canonical routine (the section set below)
├── templates/          # optional: file templates the routine fills in
└── scripts/            # optional: commands the routine runs

.claude/skills/<name>/
└── SKILL.md            # thin discovery stub with frontmatter
```

The canonical `SKILL.md` uses this repo's section set: Goal, When to use, When not to use, Inputs expected, Read first, Routine, Verification, Stop conditions, Memory step, Common mistakes, Human-readable handoff.

The `.claude` stub is only:

```md
---
name: <name>
description: Use when <trigger, one sentence, concrete enough to select this skill and no other>.
---

Follow the canonical workflow in `skills/<name>/SKILL.md`. Do not improvise a different routine.
```

## Routine

1. Confirm the threshold: name the three or more past occurrences of the pattern. Fewer than three, stop — no skill yet.
2. Check the loop index in `docs/LOOP_ENGINEERING.md` for overlap. If the proposed skill overlaps an existing skill, stop and ask whether to merge, split, replace, or keep it as chat-only guidance — never decide this autonomously.
3. Extract from the past work: the standard steps in order, the project-specific rules that were restated every time, and the common traps that were hit.
4. Separate parameters from constants. What varies per use (names, paths, schemas, screens) goes in Inputs expected; what never varies (conventions, commands, exact local paths) goes in the routine and rules. Never hard-code a one-off business detail that makes the skill single-use.
5. Produce a draft skill proposal for the user with exactly these parts:
   - proposed skill name,
   - trigger,
   - why this deserves a skill (the 3+ occurrences, named),
   - expected inputs,
   - workflow summary,
   - overlap check against existing skills,
   - files that would be created or modified (including any index rows in `AGENTS.md` and `docs/LOOP_ENGINEERING.md`).
6. Wait for explicit approval. Expect one or two iterations on the draft. No skill files, stubs, scripts, templates, or index edits before approval.
7. Only after approval: write the canonical `skills/<name>/SKILL.md` and the `.claude/skills/<name>/SKILL.md` stub, add the trigger row to the loop index in `docs/LOOP_ENGINEERING.md` (and the disambiguation table if the new trigger borders an existing one), add the name to the skill index in `AGENTS.md`, then run the memory step. Writing rules for the skill body:
   - The trigger (When to use / stub description) must be concrete enough that this skill and no other is selected.
   - Numbered steps, each one actionable.
   - Exact local paths and exact commands, not descriptions of them.
   - Verification is a checklist of acceptance criteria, not "make sure it works".
   - Short enough to execute in one read — target the length of the existing skills, never an essay.
8. Iterating an existing skill (skills are not write-once): after a use where the agent skipped a step, a convention was misunderstood, or a new edge case appeared, propose the specific edit and apply it after approval. Keep the edit minimal — do not rewrite the skill to fix one line. Trigger changes, boundary changes, merges, deletions, and new scripts/templates always go through the proposal gate.

## Library maintenance

Review the skill library periodically (monthly is enough): flag stale skills whose paths or conventions no longer match the project, and flag skills whose triggers have drifted into overlap. Deletions and merges are proposals — the human approves before any file is removed or combined. A curated ten beats a mediocre hundred — every extra skill makes selection harder.

## Verification

- The structured proposal (name, trigger, why, inputs, workflow summary, overlap check, files) was shown and explicitly approved before any files were created or modified.
- Both files exist and the stub's description states the trigger in one sentence.
- The loop index in `docs/LOOP_ENGINEERING.md` and the skill index in `AGENTS.md` list the new skill, and no two index rows can fire on the same task.
- Every path and command in the skill was checked against the current repo, not written from memory.

## Stop conditions

- Any trigger overlap with an existing skill: stop and ask whether to merge, split, replace, or keep it as chat-only guidance. Overlap decisions affect the whole skill library and are never made autonomously.
- No explicit approval yet: proposing is autonomous, creating is not. Waiting at the proposal is the correct end state for the session.
- The pattern turns out to need product or scope decisions (new flows, new features): that is a `docs/BLUEBOOK.md` question, not a skill.

## Memory step

- Add a `docs/DECISIONS.md` entry for the new or merged skill (a skill is a workflow decision).
- Update `docs/TASKS.md` only if the skill creation was itself a tracked task.

## Common mistakes

- Writing the skill too detailed — a 1,000-line skill buries the point and the agent cannot hold the thread.
- Overlapping triggers — two skills fire on the same task and the agent cannot pick one.
- Hard-coding business details that should be parameters, making the skill single-use.
- Not maintaining — the project structure changes, the skill still references old paths, and it misleads instead of helps.
- Too many skills — selection cost grows with every addition; prefer a curated few over a mediocre many.
- Creating the skill on the first or second repetition, before the pattern has stabilized.
- Treating a nod in chat as approval for a different scope — approval covers exactly the files listed in the proposal, nothing more.
- Slipping skill or index edits into an unrelated task because they seemed small.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
