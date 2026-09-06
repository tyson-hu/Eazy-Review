# Eazy Review

Mobile-first sneaker/product discovery and reviews. Browse → Product Detail →
Eazy Score / Community Score → My Rating. Expo Router, React Native,
TypeScript, NativeWind, Supabase and TanStack Query; package.json owns versions.

Check Git state and preserve unrelated work. Use the user's current request;
read the relevant TASKS entry when it governs the work. On resumption, read the
linked plan and docs/notes/handoff.md, checking them against the current tree.
Do not read the entire ledger or documentation set before each edit.

Complete the authorized outcome, affected validation, and necessary docs.
Continue across investigation, implementation, and repair while the same scope
remains authorized. Record progress during long work. Ask only for a missing
decision or authority that blocks the next action; approval already given
persists. Honor explicit edit allowlists and design-before-implementation requests.

Product rules: public browsing; login to rate; exact UI names Eazy Score,
Community Score, My Rating. Rating uses the ten sneaker-10-v1 dimensions in
0–10 half-steps, derived 0–100 My Rating, optional private note, no editable
Overall. DESIGN owns the UI. BLUEBOOK owns MVP scope; do not add social,
scraping, admin, notifications, dark mode or other excluded features incidentally.

Safety: never expose secrets, use remote pipe-to-shell, or run unreviewed
repository validation code on the host. Review executable inputs against a
trusted base or use exact-SHA disposable credential-free isolation. Production
database access and agent-executed account deletion in any environment are
forbidden. Destructive commands, credential changes, publication, deployment,
merge and board changes retain their explicit authorization requirements.
Approved ordinary local edits and trusted tests do not need repeated permission.

Read only the affected contract sections:

| Work | Owner |
| --- | --- |
| UI/navigation | docs/DESIGN.md, docs/USER_FLOWS.md |
| Frontend types, fixtures, data access | docs/API_CONTRACTS.md |
| SQL/RLS/grants/database contracts | docs/DATA_MODEL.md, docs/API_CONTRACTS.md; schema skill |
| Auth, private data, recovery, deletion, install or executable trust | docs/SECURITY.md and affected API contract |
| Checks, delegation, refactor, failure handling, continuation | Relevant section of docs/AGENT_WORKFLOW.md |
| Affected docs, acceptance, PR/merge/board delivery | Relevant section of docs/DOCUMENTATION_POLICY.md |
| External tools/actions | docs/MCP_WORKFLOW.md |
| Prior decisions | Search docs/DECISIONS.md; open relevant current records |

Ordinary implementation needs no skill. Load a project skill for its specialized
procedure; global/provider skills supply relevant expertise without expanding
scope or replacing project contracts. Match Expo API/configuration guidance to
installed versions when those specifics matter. Cursor domain rules are adapters
to the same owners, not an additional required read for other hosts.

Skill maintenance: audit and draft freely within the request; obtain scoped
draft approval before changing skills, triggers, or their indexes. Follow the
project skill-creator. skills/manifest.json owns discovery; edit canonical skills
under skills/, then generate both wrapper trees with npm run skills:generate.
Never hand-edit generated wrappers or docs/DECISIONS.md.
