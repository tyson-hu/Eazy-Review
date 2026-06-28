# Eazy Review Decisions

Use this file for decisions that change product direction, architecture, naming, data model, or workflow.

## 2026-06-28: Establish Document-Controlled Workflow

Decision:
- Product and engineering direction live in `docs/BLUEBOOK.md`.
- UI direction lives in `docs/DESIGN.md`.
- Data model lives in `docs/DATA_MODEL.md`.
- Agent behavior lives in `AGENTS.md`.
- Cursor-specific rules live in `.cursor/rules`.

Reason:
- The project needs durable source-of-truth docs so tools follow the product direction instead of inventing it.

## 2026-06-28: Use Eazy Score Naming In UI

Decision:
- UI uses `Eazy Score`, `Community Score`, and `My Rating`.
- Database may keep the internal table name `official_ratings`.

Reason:
- "Official rating" could imply Adidas, StockX, or another official source.

## 2026-06-28: Mock Core Flow Before Supabase

Decision:
- Build Browse, Product Detail, and Rating Form with mock data before connecting Supabase.

Reason:
- The core UX should be validated before backend complexity is added.

## 2026-06-28: Recalculate Community Score Server-Side

Decision:
- Trusted Community Score calculations belong in Supabase trigger/function or equivalent server-side logic.

Reason:
- Client-calculated aggregate scores are not trustworthy for persisted product summaries.

## 2026-06-28: Make Design Principles UI-Specific

Decision:
- `docs/DESIGN_PRINCIPLES.md` is now the UI design brief, not a general product-rule list.
- The visual direction uses a premium sneaker review intelligence system with `#F7F8FA` background, `#FFFFFF` cards, `#2563EB` primary accent, and decision-first screen hierarchy.

Reason:
- The project needs stronger UI guidance for Stitch, Cursor, and implementation so generated screens do not drift into generic sneaker ecommerce layouts.
