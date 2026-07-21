# Interactive Preview Loop

Goal: produce evidence-backed interactive verification of an Expo user journey (iOS Simulator and/or reference mobile-web viewport), or a screenshot UX audit with numbered captures and triaged findings — without editing product code.

## When to use

- A task requires evidence-backed interactive verification of an Expo user journey in iOS Simulator or the project reference mobile-web viewport, or a screenshot-based UX audit with numbered captures and triaged findings.
- Integrated completion asks for a simulator / interactive preview walk.
- Parent-owned UX readiness gates (baseline capture → findings → triage).

## When not to use

- Automated project checks (typecheck, lint, Expo doctor, routes, dependencies): use `skills/test-and-validation-loop`.
- Changing screen layout, styling, hierarchy, or components: use `skills/ui-screen-builder` **after** triage.
- Investigating and fixing a known behavior defect: use `skills/bugfix-debug-loop` **after** triage.
- One-off glances while implementing UI: stay in `ui-screen-builder` (its 393px visual pass is not this loop).

This is an **evidence and verification loop**. Do not edit product code, apply visual fixes, or create implementation packets while running it. When a failure or UX issue is found: capture the evidence, classify severity, and record it. **Blocking** failures (P0, P1, or core-flow blockers on a walk) stop the run immediately for triage. On `screenshot-audit`, finish the required capture table first and accumulate non-blocking (P2/P3) findings, then stop after the findings report for triage. After triage, use `ui-screen-builder` for visual/layout changes or `bugfix-debug-loop` for incorrect existing behavior.

## Inputs expected

- **Mode:** `simulator-walk` | `web-preview` | `screenshot-audit`
- **Journey** or step table (default: Browse → Product Detail → Rating Form)
- **Evidence directory:** `docs/evidence/<task-or-topic>/` (create if missing)
- Optional: which environments to run; physical device expectation

## Read first

| Mode | Read first | Required environment / tool |
| --- | --- | --- |
| `simulator-walk` | `docs/MOBILE_SIMULATOR_SOP.md` | iOS Simulator, `xcrun simctl`, Expo/Metro |
| `web-preview` | `docs/WEB_MOBILE_PREVIEW_SOP.md` | Expo web, Playwright MCP (`user-playwright`), reference mobile-web viewport (default **393×852** from `docs/DESIGN.md`) |
| `screenshot-audit` | `docs/UX_SCREENSHOT_AUDIT_SOP.md` (plus mobile and/or web SOPs when capturing) | Existing evidence under `docs/evidence/…`, or one of the live capture environments above |
| All modes | `docs/evidence/README.md` | Evidence layout, naming, status vocabulary |
| Committing evidence | `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md` | Representative GitHub proof set vs local-only raw captures |

Also read the current task in `docs/TASKS.md` when the run advances a listed task.

## Routine

1. Confirm mode and evidence directory (`docs/evidence/<task-or-topic>/`). Create `screenshots/` under it when capturing.
2. Start Metro **only** when the selected mode requires a live application capture. For an audit of existing evidence, verify the evidence inventory and do not start a replacement environment unnecessarily.
3. Follow the SOP for the mode exactly (commands, deep-link limits, Playwright dialog/session rules, screenshot naming). Do not invent alternate tooling.
4. If the required simulator, MCP tool, browser capability, or runtime is unavailable, mark that environment `blocked` or `not-run` and stop. Do not silently substitute different tooling.
5. Capture numbered screenshots with deterministic names (`01-browse.png`, `02-product-detail.png`, …). Use a `web-` prefix for web captures when both environments are in the same folder.
6. Assign exactly one status per environment slot (`pass` | `fail` | `blocked` | `not-run`; physical device: `tested-pass` | `tested-fail` | `not-tested`).
7. Record failures and UX issues with severity (P0–P3 for audits) and cite screenshot id or observed step. **Do not open fix packets from this loop.**
   - `simulator-walk` / `web-preview`: on P0, P1, or a core-flow blocker, stop immediately for triage; otherwise finish the planned journey checklist, then report.
   - `screenshot-audit`: complete the required capture table before writing findings; accumulate non-blocking P2/P3 findings during capture; stop for triage only after the findings report (or immediately on P0/P1/core-flow blockers that make further captures meaningless).
8. Write the run report (below) into the evidence folder and/or `docs/TASKS.md` progress. Run the memory step.

### Run report contract (every run)

```md
- Mode
- Journey
- Environment matrix
- Overall result
- Step-by-step pass/fail
- Evidence directory
- Evidence filenames
- GitHub disposition (selected proof versus local-only raw captures)
- Findings and severity
- Known limitations
- Automated checks run separately
- Required next decision
```

## Verification

- Evidence lives under `docs/evidence/<task-or-topic>/`, not `docs/notes/`.
- No product code was edited during the loop.
- Each required environment has exactly one status from the vocabulary above.
- Physical device is never implied tested when it was not.
- Findings (if any) cite screenshot ids or observed steps.
- The report distinguishes the proof selected for GitHub from local-only raw captures.
- Required next decision is explicit (e.g. parent triage, accept findings, re-run after fixes).
- Automated npm checks were either run via `test-and-validation-loop` separately or listed as not part of this run.

## Stop conditions

- Required simulator, MCP, browser, or runtime unavailable: mark `blocked` / `not-run` and stop; no silent tooling swap.
- Any P0/P1/core-flow failure during a walk or audit: capture, report, stop for triage — do not fix in this loop. Non-blocking P2/P3 audit findings accumulate until the capture set (or journey checklist) is complete.
- Screenshot-audit baseline complete: stop after findings; wait for Accept / Reject / Defer before any implementation packet.
- Scope expands into Feed, Account, auth, Supabase, or social surfaces not named by the task: stop and ask the parent.

## Memory step

- Update `docs/TASKS.md` with progress, evidence path, environment statuses, and deferred findings when appropriate.
- Add `docs/DECISIONS.md` only when a genuine workflow or product decision occurs (not for routine pass/fail runs).
- Do not write verification evidence into `docs/notes/`.

## Common mistakes

- Saving screenshots under `docs/notes/` (session state only).
- Editing UI or opening implementer packets mid-walk.
- Treating web-only results as full iOS acceptance when the task required a simulator walk.
- Filing navigation bugs from deep-link-only stacks without Browse → Detail reproduction.
- Hard `page.goto` mid-session and treating mock rating reset as a product bug.
- Skipping environment status disclosure (`not-tested` / `not-run`).
- Using this loop instead of `test-and-validation-loop` for typecheck/lint/check.

## Human-readable handoff

End with the five-section handoff (What changed / Why it matters / What is safe / What needs review / Validation) per `docs/AGENT_WORKFLOW.md`.
