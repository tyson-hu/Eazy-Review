# skill-creator

The project owner for auditing or changing Eazy Review skills and discovery.
Global creators may supply expertise, not different storage or approval rules.

For an audit, inventory triggers, actual consumers and useful unique procedure;
propose keep, shorten, merge or delete. Overlap is a reason to evaluate alternatives,
not to stop drafting. No skill/index/configuration writes follow from an audit.

For a skill change:
1. Establish explicit intent. Proactive new-skill proposals need three repeated
   uses; a human-directed request waives only that threshold.
2. Draft the exact scope and text: trigger, overlap disposition, necessary
   procedure, conditional references, evidence/result, and unique stop conditions.
   Prefer deletion or an existing owner over a new skill or duplicate policy.
   Include affected manifest/index/reference/script/template files in the scope.
3. Review safety and dependencies against SECURITY, MCP_WORKFLOW and the current
   execution contract. Scripts/templates need explicit inspection and approval.
   Record positive and neighboring selection cases; prefer executed task evidence
   when workflow behavior changes. Distinguish simulations from task execution.
4. Obtain scoped draft approval before creating, deleting, merging or materially
   changing skills, triggers or indexes. Resolve overlap in that same proposal;
   do not ask again for each already-approved file or routine generation step.
5. Apply the approved canonical/manifest changes, regenerate both wrapper trees
   with npm run skills:generate, and run check:skill-wrappers plus affected
   infrastructure/decision/final checks selected by AGENT_WORKFLOW.

Return actual deletions/consolidations, surviving owners, selection evidence,
checks and remaining decision. Author routines in skills/<name>/SKILL.md;
skills/manifest.json owns descriptions. Never edit generated wrappers by hand.
