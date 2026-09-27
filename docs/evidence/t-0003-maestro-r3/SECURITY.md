# T-0003 revision 3: subprocess environment gate

Recovery began 2026-09-26 23:05:08 UTC. Hub authority was main
022ec13fb1c009621c98b867469c9cd386e405ba, STATE 13, sole active task T-0003,
contract 3 / D2 REWORK. Project base remains f71a1d90aaa7367359104fcaffa848afd6b30093.
PR 63 was Draft at d9816a5d34363788cf2630986a7376a8d92a6d32.
Local branch was 99828a60dc8df003c26fa3dcc70a3e1b6464b2e2; historical UI-tested
commit was 66b02dd59008537797e40c33ce4cfd621809d865 (one pass, then failure).
The old checkout was absent; its committed work and evidence were restored into
the managed t-0003-security checkout without rebasing. Four untracked planning
documents in the primary checkout remain untouched. No contract/code drift found.

Independent control plane: user-provided AGENTS plus unchanged rules and
pr-review-remediation at trusted default/base f71a1d9. All affected executable
inputs were reviewed against that base before host execution. package scripts,
lockfile, configs and existing validation scripts are unchanged; the two new
Python files were read in full. No Maestro, simulator or database action was
used for this gate. Local validation uses pre-existing dependency files.

Root cause host-env-inheritance: GitHub comment 4111958580, reviewed at d9816a5,
accepted P1. The qualifying integrated baseline review remains the existing
GitHub Codex review at that SHA. Revision 3 explicitly authorizes this bounded
continuation and targeted existing code/security follow-up; no full feature
audit is requested. Parent owns security changes.

The recovered allowlist is real, but has been narrowed per tool:

| Tool | Host variables | Explicit generated settings |
| --- | --- | --- |
| git (local status/rev-parse) | PATH, LANG, LC_ALL, LC_CTYPE | none |
| Supabase | above plus HOME, TMPDIR, TMP, TEMP | DO_NOT_TRACK; fixed loopback auth URL only for start |
| xcrun | runtime set plus DEVELOPER_DIR | none |
| Maestro | runtime set plus DEVELOPER_DIR, JAVA_HOME | three analytics/update flags; only generated email/password/product ID/SKU |

Unknown tool names fail closed. No shell environment copy/denylist is used.
No product, auth, API, schema, rating behavior, provider or CI policy changes.

RED: loading the reviewed d9816a5 Python module, clearing its environment and
mocking subprocess.run demonstrated propagation of all four placeholder names:
DATABASE_URL, PGPASSWORD, AWS_ACCESS_KEY_ID and mixed-case npm _authToken.
No actual host credentials, external command or network was used.

GREEN: python3 scripts/test-maestro-local.py passes all three offline tests.
The regression inspects actual subprocess.run env for git, xcrun, Supabase
status/start, and mocked Maestro Popen env, including explicit fixture values.
It excludes the four reported credential forms and GitHub/Supabase/AWS secrets,
SSH_AUTH_SOCK, proxies, runtime injection options and an unknown future credential.
Unknown fixture fields also cannot reach Maestro. Proxy isolation and failed DB
verification reporting regressions remain passing. Existing check:readonly and
git diff --check passed. These are local checks, not CI or native E2E results.

Remote review, CI, thread disposition and any Phase 2 outcome are recorded in
RESULT.md after observing the actual remote state. Historical R2 evidence is
preserved and must not be interpreted as a current repeatability pass.
