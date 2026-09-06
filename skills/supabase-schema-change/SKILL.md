# supabase-schema-change

For schema, migrations, RLS, grants, database functions/triggers or database
contracts. Existing-schema frontend reads and seed-only data do not select this.

1. Establish planning versus authorized implementation, affected contract and
   environment. Read affected DATA_MODEL/API_CONTRACTS and SECURITY sections.
   Planning produces a proposal; it does not initialize, install, link or apply.
2. Design the smallest forward migration against the accepted current schema.
   Do not edit applied migrations or infer a new schema from historical task order.
   Check RLS and effective grants separately, privileged function boundaries,
   identity/private data and server-owned aggregate invariants where affected.
3. In an authorized implementation use local disposable validation by default.
   Staging requires its actual authorization; production database access and
   actual agent-executed account deletion remain forbidden.
4. Exercise relevant positive and denial cases, migration and concurrency behavior
   when affected, and regenerate/check local database types when their contract
   changes. Select existing commands from AGENT_WORKFLOW/package.json.

Return migration scope, environment, contract/type changes, executed proof and
remaining human action. Missing privilege/schema/environment authority is a
specific blocked prerequisite, not permission to configure a remote target.
