# skill-creator

Goal: turn a task pattern that has been explained repeatedly into one new skill in `skills/<name>/SKILL.md`, with a clear trigger, numbered steps, project-specific rules, and acceptance criteria — draft first, files after approval.

A skill is a reusable, parameterized workflow template for an agent. Chat instructions evaporate; skills persist. That persistence cuts both ways: a bad skill is worse than a bad prompt, because future agents keep following it.

## Approval gate (hybrid rule)

Agent proposes. Human approves. Agent implements after approval.

- **Agent-proactive path:** Agents may proactively propose a new skill only after the same task pattern, convention, or workflow has been explained 3+ times ("You have explained this same workflow 3+ times. This may deserve a skill."). The three-use threshold gates automatic proposals only.
- **Human-directed path:** The human may explicitly request or approve adding a reviewed skill without three prior occurrences. That waives **only** the three-use threshold for that skill. Every other gate below still applies in full.
- Agents must not create, delete, merge, or substantially modify skill files without explicit human approval. Requires approval: creating a skill, deleting a skill, merging skills, changing a trigger, changing skill boundaries, adding `scripts/` or `templates/`, and editing the skill indexes in `AGENTS.md`, `docs/LOOP_ENGINEERING.md`, or `skills/manifest.json`.
- The human decides whether the workflow is common enough, whether it overlaps an existing skill, whether the trigger is too broad, whether it adds too much context, and whether it belongs in a skill at all — versus `AGENTS.md`, `docs/AGENT_WORKFLOW.md`, or just the current task.
- Skills share context with every other instruction: keep them concise and focused, capturing only specific, useful conventions.

## Remaining gate (both paths — not waived)

Waiving three-use never authorizes a malicious, accidental, or defective skill. On **both** paths, stop unless all of the following hold:

1. **Explicit human intent.** The human clearly asked to add, draft, land, or approve a named skill (or approved a proposal that lists exact files). Vague praise, “sounds good,” unrelated task chatter, or an agent-inferred need is not direction and is not approval.
2. **Scoped draft approval.** Approval covers exactly the files and scope listed in the proposal. Do not add indexes, scripts, templates, sibling skills, or broader trigger changes under the same nod.
3. **Overlap and selection safety.** The loop index and disambiguation table show no unresolved trigger collision. If overlap exists, stop for a human merge/split/replace/chat-only decision.
4. **Quality bar.** The draft has a concrete trigger, numbered actionable steps, exact local paths/commands, a verification checklist, stop conditions, and stays short enough for one read. Defective drafts are revised or rejected — not landed.
5. **Security and abuse bar.** The skill must not instruct or normalize forbidden or high-risk actions from `docs/SECURITY.md`, `docs/MCP_WORKFLOW.md`, or `docs/AGENT_WORKFLOW.md` (examples: production database access, agent-executed account deletion, secret exposure, remote pipe-to-shell, silent environment retargeting, unapproved credential use). `scripts/` and `templates/` need separate explicit approval and inspection before any install or execution guidance is added.
6. **Post-write proof.** After an approved write: wrappers regenerate cleanly, `npm run check:skill-wrappers` passes, and the skill appears correctly in `skills/manifest.json`, `docs/LOOP_ENGINEERING.md`, and `AGENTS.md`.

If any item fails, do not create or modify skill files. Fix the draft or stop.

## When to use

- The same task pattern has been explained at least three times across sessions (for example: the same conventions repeated for every new screen, every migration, every report) — agent-proactive proposal path.
- The user explicitly asks to add, draft, or land a reviewed skill even when fewer than three prior uses exist — human-directed path; three-use does not block.
- The user asks to turn repeated prompts into a skill, tune a skill's trigger description, or test a skill.
- Existing skills need maintenance: a step was skipped in practice, a convention was misunderstood, a new edge case appeared, or the library needs a periodic review.

Typical patterns worth capturing: add an API endpoint, create a database migration, write a recurring report, refactor a component into hooks, review a PR against team rules, fix lint errors and add tests.

## When not to use

- The pattern has occurred once or twice and the human has not explicitly directed skill creation: keep it in chat; three repetitions is the agent-proactive threshold.
- The workflow already matches an existing skill: iterate that skill instead of creating an overlapping one (check the loop index in `docs/LOOP_ENGINEERING.md` first).
- The "skill" would be one-off business logic with nothing parameterized: that is a task, not a template.
- The draft would weaken security, authorization, secret handling, or environment boundaries, or would tell agents to perform a forbidden action: reject it; do not “fix later” inside a skill.
- Intent is ambiguous: ask whether the human wants a skill proposal. Do not treat ambiguity as human-directed waiver or approval.

## Inputs expected

- The repeated pattern: which past tasks followed it, and what conventions were restated each time.
- A short kebab-case name for the skill.
- What varies between uses (the parameters) versus what is fixed (the project rules).

## Read first

- `docs/LOOP_ENGINEERING.md` — loop anatomy (every skill needs trigger, goal, required context, routine, verification, stop conditions, memory, handoff) and the loop index, to confirm no trigger overlap.
- One existing skill (for example `skills/bugfix-debug-loop/SKILL.md`) as the structural reference.
- `docs/SECURITY.md` and `docs/MCP_WORKFLOW.md` when the draft touches credentials, environments, destructive actions, installs, or external tools.
- `docs/AGENT_WORKFLOW.md` when the draft changes delegation, validation ownership, or write boundaries.

## Repo skill structure

Every skill in this repo is one canonical routine plus two identical generated discovery stubs and optional support folders:

```
skills/manifest.json     # authoritative wrapper name + description records

skills/<name>/
├── SKILL.md            # canonical routine (the section set below)
├── templates/          # optional: file templates the routine fills in
└── scripts/            # optional: commands the routine runs

.claude/skills/<name>/
└── SKILL.md            # discovery stub — Claude Code reads only this path

.agents/skills/<name>/
└── SKILL.md            # same stub — Agent Skills standard path (Codex, Cursor, others)
```

The canonical `SKILL.md` uses this repo's section set: Goal, When to use, When not to use, Inputs expected, Read first, Routine, Verification, Stop conditions, Memory step, Common mistakes, Human-readable handoff.

Both stubs have identical content and are only:

```md
---
name: <name>
description: "Use when <trigger, one sentence, concrete enough to select this skill and no other>."
---

Follow the canonical workflow in `skills/<name>/SKILL.md`. Do not improvise a different routine.
```

Do not edit either stub by hand. Add or update the sorted `{ "name", "description" }` record in `skills/manifest.json`, then run `npm run skills:generate`.

## Read-only library audit

For an explicitly authorized read-only library audit, use this branch instead
of the creation routine: inventory triggers and dependencies, compare overlap,
and propose keep, shorten, correct, consolidate/remove, or defer dispositions.
Overlap is evidence to explain and does not stop collection or drafting.
This branch permits no skill, index, script, template, installation, or
configuration write. The existing creation/maintenance approval gate and its
write verification apply before proposed writes, not audit-report drafting.

## Routine

1. Choose the creation path, then confirm the matching entry gate:
   - **Agent-proactive:** name the three or more past occurrences of the pattern. Fewer than three, stop — no proactive proposal and no skill yet.
   - **Human-directed:** confirm the human explicitly requested or is reviewing a named skill addition in clear language. Record that **only** the three-use threshold is waived; do not invent that waiver.
2. Run the **Remaining gate** checklist above. Any failure stops the routine before a proposal is treated as ready to land.
3. Check the loop index in `docs/LOOP_ENGINEERING.md` for overlap. If the proposed skill overlaps an existing skill, stop and ask whether to merge, split, replace, or keep it as chat-only guidance — never decide this autonomously.
4. Extract from the past work: the standard steps in order, the project-specific rules that were restated every time, and the common traps that were hit.
5. Separate parameters from constants. What varies per use (names, paths, schemas, screens) goes in Inputs expected; what never varies (conventions, commands, exact local paths) goes in the routine and rules. Never hard-code a one-off business detail that makes the skill single-use.
6. Produce a draft skill proposal for the user with exactly these parts:
   - proposed skill name,
   - trigger,
   - why this deserves a skill (named 3+ occurrences on the agent-proactive path, or the human-directed waiver and review reason on the human-directed path),
   - remaining-gate summary (intent, scope, overlap, quality, security/abuse, planned validation),
   - expected inputs,
   - workflow summary,
   - overlap check against existing skills,
   - files that would be created or modified (including `skills/manifest.json` and any index rows in `AGENTS.md` and `docs/LOOP_ENGINEERING.md`).
7. Wait for explicit approval of that exact proposal. Expect one or two iterations on the draft. No skill files, stubs, scripts, templates, or index edits before approval.
8. Only after approval: write the canonical `skills/<name>/SKILL.md`, add its sorted name and trigger description to `skills/manifest.json`, run `npm run skills:generate`, add the trigger row to the loop index in `docs/LOOP_ENGINEERING.md` (and the disambiguation table if the new trigger borders an existing one), add the name to the skill index in `AGENTS.md`, then run the memory step. Writing rules for the skill body:
   - The trigger (When to use / stub description) must be concrete enough that this skill and no other is selected.
   - Numbered steps, each one actionable.
   - Exact local paths and exact commands, not descriptions of them.
   - Verification is a checklist of acceptance criteria, not "make sure it works".
   - Short enough to execute in one read — target the length of the existing skills, never an essay.
9. Iterating an existing skill (skills are not write-once): after a use where the agent skipped a step, a convention was misunderstood, or a new edge case appeared, propose the specific edit and apply it after approval. Keep the edit minimal — do not rewrite the skill to fix one line. Trigger changes, boundary changes, merges, deletions, and new scripts/templates always go through the proposal gate and the Remaining gate.

## Library maintenance

Review the skill library periodically (monthly is enough): flag stale skills whose paths or conventions no longer match the project, and flag skills whose triggers have drifted into overlap. Deletions and merges are proposals — the human approves before any file is removed or combined. A curated ten beats a mediocre hundred — every extra skill makes selection harder.

## Verification

- For a proposed trigger or workflow change, record one realistic selecting
  request and one neighboring request, then check their decisions in a fresh
  read-only context. Distinguish simulation from execution and retain the
  tested instructions and limits.
- The structured proposal (name, trigger, why, remaining-gate summary, inputs, workflow summary, overlap check, files) was shown and explicitly approved before any files were created or modified.
- The proposal's "why" either names 3+ occurrences (agent-proactive) or records an explicit human-directed three-use waiver (human-directed), and the Remaining gate checklist passed on the same draft.
- The skill does not instruct forbidden or unapproved high-risk actions; any `scripts/` or `templates/` were separately approved and inspected.
- The canonical file exists, `skills/manifest.json` contains its sorted name and one-sentence trigger description, and `npm run skills:generate` produces both identical discovery stubs.
- `npm run check:skill-wrappers` passes; it validates the manifest, canonical inventory, exact generated output, and generator tests without parsing canonical skill prose or documentation indexes.
- The loop index in `docs/LOOP_ENGINEERING.md` and the skill index in `AGENTS.md` list the new skill, and no two index rows can fire on the same task.
- Every path and command in the skill was checked against the current repo, not written from memory.

## Stop conditions

- Any Remaining gate item fails: stop; revise or reject. Do not land a partial or “fix later” skill.
- Any trigger overlap with an existing skill: stop and ask whether to merge, split, replace, or keep it as chat-only guidance. Overlap decisions affect the whole skill library and are never made autonomously.
- Agent-proactive path with fewer than three named occurrences: stop — no proactive proposal yet. Do not treat this stop as blocking a human-directed reviewed addition, and do not treat the human-directed path as skipping the Remaining gate.
- Human intent or approval scope is ambiguous: stop and ask; never invent direction, waiver, or approval.
- No explicit approval yet: proposing is autonomous, creating is not. Waiting at the proposal is the correct end state for the session.
- The pattern turns out to need product or scope decisions (new flows, new features): that is a `docs/BLUEBOOK.md` question, not a skill.

## Memory step

- Add or update a `docs/decisions/*.md` record when the new or merged skill establishes a durable high-impact workflow decision under `docs/decisions/README.md`; do not record routine skill maintenance as an ADR.
- Update `docs/TASKS.md` only if the skill creation was itself a tracked task.

## Common mistakes

- Writing the skill too detailed — a 1,000-line skill buries the point and the agent cannot hold the thread.
- Overlapping triggers — two skills fire on the same task and the agent cannot pick one.
- Hard-coding business details that should be parameters, making the skill single-use.
- Not maintaining — the project structure changes, the skill still references old paths, and it misleads instead of helps.
- Too many skills — selection cost grows with every addition; prefer a curated few over a mediocre many.
- Creating the skill on the first or second repetition without human direction, before the pattern has stabilized.
- Treating the three-use waiver as permission to skip intent, scope, overlap, quality, security, or post-write checks.
- Inventing a three-use waiver, human direction, or approval the human did not give.
- Landing a defective draft because the human asked for a skill “in general.”
- Encoding forbidden or high-risk actions into a skill to make a task “easier.”
- Treating a nod in chat as approval for a different scope — approval covers exactly the files listed in the proposal, nothing more.
- Slipping skill or index edits into an unrelated task because they seemed small.
- Editing a generated discovery stub instead of changing the manifest and regenerating both trees.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
