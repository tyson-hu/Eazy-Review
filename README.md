# Eazy Review

An independent engineering project: a mobile-first sneaker review app for discovering
products, comparing **Eazy Score** with **Community Score**, and keeping a personal
**My Rating**.

[Host & agent setup](docs/HOST_SETUP.md) · [Development guide](docs/DEVELOPMENT.md) · [LLM guide](llms.txt) · [Build journal](https://lab.tianzhe.me/) · [Project board](https://github.com/users/tyson-hu/projects/4)

## What exists

- Public Feed, Browse and Product Detail backed by Supabase/PostgreSQL.
  Feed highlights Newly Added, Best Eazy Scores, Most Rated when enough products
  have ratings, and published curated collections.
- Email/password accounts, personal ratings across ten sneaker dimensions,
  server-derived Community Score, and Rated Products history.
- Local/development password recovery through app deep links and protected
  account deletion with recorded human acceptance.
- Offline, reconnect, timeout and backend-unreachable feedback. Failed rating
  writes preserve form input for manual retry; there is no durable offline cache
  or write queue.

Feed was human accepted in [PR #52](https://github.com/tyson-hu/Eazy-Review/pull/52).
Production setup and release readiness remain separate work; see the
[task ledger](docs/TASKS.md) and [release checklist](docs/RELEASE_CHECKLIST.md).
The build journal documents the project; it is not a hosted app demo.

## Preview

Discover sneakers in Feed, search the catalog in Browse, and compare **Eazy
Score** with **Community Score** on Product Detail. Edit the ten rating
dimensions in half-steps to calculate **My Rating**, then save your changes.

<p>
  <img src="docs/evidence/repository-experience/screenshots/ios-feed-newly-added.png" alt="Feed: Newly Added spotlight with product image, Eazy Score and offer summary" width="240">
  <img src="docs/evidence/repository-experience/screenshots/ios-browse.png" alt="Browse: searchable sneaker catalog with Eazy Score, Community Score and offer cards" width="240">
</p>

<p>
  <img src="docs/evidence/repository-experience/screenshots/ios-product-detail.png" alt="Product Detail: editorial and community scores, decision summary and Edit my rating action" width="240">
  <img src="docs/evidence/repository-experience/screenshots/ios-edit-rating.png" alt="Edit rating: derived My Rating, category sliders with half-step controls and Save changes action" width="240">
</p>

<details>
<summary>More screens: curated Feed, offers, score dimensions and accounts</summary>

### Curated discovery and score detail

Editor's Picks highlights curated products. Product Detail shows dated offers
by size and compares the individual Eazy and Community scoring dimensions.

<p>
  <img src="docs/evidence/repository-experience/screenshots/ios-feed-editors-picks.png" alt="Feed: Editor's Picks collection followed by Best Eazy Scores" width="280">
  <img src="docs/evidence/repository-experience/screenshots/ios-offers-score-comparison.png" alt="Product Detail: verified offers by size and a dimension-by-dimension score comparison" width="280">
</p>

### Account states

Visitors can keep browsing or sign in, create an account, and start password
recovery. The signed-in account links to Rated Products and account controls.

<p>
  <img src="docs/evidence/repository-experience/screenshots/ios-account-signed-out.png" alt="Signed-out Account: sign in, create account and forgot-password entry points with public browsing available" width="280">
  <img src="docs/evidence/repository-experience/screenshots/ios-account-signed-in.png" alt="Signed-in Account: rated product count, Rated Products link, sign out and Delete Account control" width="280">
</p>

</details>

Screenshots supplied by the maintainer on September 6, 2026, from an iPhone 15
simulator labeled iOS 26.5. Images retain their original simulator frames and
development overlays. Scores and offers are captured examples, not live quotes.
[Capture provenance](docs/evidence/repository-experience/RESULT.md#maintainer-supplied-preview-gallery).

## Stack

Expo SDK 57, React Native, Expo Router, TypeScript and NativeWind provide the
mobile UI. TanStack Query and NetInfo manage connected requests. Supabase
provides authentication and PostgreSQL, with row-level security and
server-derived rating aggregates. [package.json](package.json) owns versions.

## Engineering Evidence

- Least-privilege grants, owner-scoped RLS, server-derived scores, and
  concurrency behavior: [data model and authorization contract](docs/DATA_MODEL.md)
  and [Tasks 11–12 database acceptance](docs/evidence/task-11-12-database-acceptance/RESULT.md).
- Catalog and rating failure handling, including physical-device offline and
  reconnect checks: [connected-request reliability decision](docs/decisions/2026-08-09-connected-request-reliability.md),
  [Task 15 evidence](docs/evidence/task-15-public-catalog/RESULT.md), and
  [Task 17 evidence](docs/evidence/task-17-my-rating-persistence/RESULT.md).
- Authentication, session restoration, and password recovery:
  [Task 16 evidence](docs/evidence/task-16-auth-account/RESULT.md) and
  [Task 18 evidence](docs/evidence/task-18-password-recovery/RESULT.md).
- Protected account-deletion boundary, local orchestration, and human
  acceptance evidence:
  [Task 19 evidence](docs/evidence/task-19-protected-account-deletion/RESULT.md).
- Automated frontend, database, security, and concurrency gates:
  [Expo CI](.github/workflows/expo-ci.yml) and
  [Database CI](.github/workflows/database-ci.yml).

## Run locally

New workstation or moving an existing environment? Start with the
[host and agent setup guide](docs/HOST_SETUP.md): prerequisites, Codex/Cursor/Claude
entrypoints, project skills, optional service connections, verification and a
migration checklist. Cloning restores the shared instructions and skills;
accounts, credentials and host-local tools need your own setup.

For a coding agent, explicitly provide [AGENTS.md](AGENTS.md) and the
[llms.txt reading map](llms.txt). The map follows the [llms.txt convention](https://llmstxt.org/)
and links to maintained contracts; it does not auto-install tools or replace
the agent's instructions.

Use Node.js 24 and npm `>=11.16.0 <12` (CI pins `11.17.0`), Docker Desktop
and the Supabase CLI. Review the [install rules](docs/SECURITY.md#install-and-setup-scripts)
before running setup:

```bash
npm ci
test -e .env || cp .env.example .env
supabase start
```

Set `.env` to the local Supabase URL and publishable/legacy anon key from your
local instance. The example values intentionally do not connect. Follow the
[local database setup](docs/DEVELOPMENT.md#local-supabase) to seed the disposable
development database, then use `npm run web` or the
[iPhone development-build guide](docs/DEVELOPMENT.md#physical-iphone-development-and-offline-testing).
Never put a service-role key in the app bundle or share environment files.

## Quality and contribution

After reviewing executable inputs, use `npm run check:readonly` for the
read-only repository gate and `npm test` for frontend tests. The full Expo
gate is `npm run check:expo`; database and Edge Function changes have their
own checks. Follow the [validation map](docs/AGENT_WORKFLOW.md#validation)
to select affected checks. Automation does not replace human or device acceptance.

Start with [Contributing](CONTRIBUTING.md), [Support](SUPPORT.md), and the
[Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities through the
[security policy](docs/SECURITY.md), not public issues.

Product scope lives in [BLUEBOOK](docs/BLUEBOOK.md), UI decisions in
[DESIGN](docs/DESIGN.md), and frontend boundaries in
[API contracts](docs/API_CONTRACTS.md). [AGENTS.md](AGENTS.md) routes coding
agents to the relevant contracts; [documentation policy](docs/DOCUMENTATION_POLICY.md)
owns documentation updates.

Licensed under [MIT](LICENSE).
