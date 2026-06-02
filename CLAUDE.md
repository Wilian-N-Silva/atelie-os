# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Implementation has **started** (Next.js + Tailwind + shadcn). A design prototype is being ported into `src/`. **If you are picking this up, read `HANDOFF.md` at the repo root first** — it records what's built, the locked decisions, the design-bundle locations (including a second bundle with auth screens still to fetch), and the exact remaining work in order.

The original design docs under `docs/` remain the product source of truth. When starting code work, follow the recommended stack and the phased implementation order below rather than inventing a different architecture.

The working language of the product and docs is **Portuguese (pt-BR)**. The domain is a backoffice ("Ateliê OS") for a small artisanal scented-candle maker (Instante Âmbar), designed white-label from day one.

## Source of truth

- `docs/prd-v2.1-atelie-os-instante-ambar.md` — the authoritative spec. It defines the product scope, the full module list (§7), the data model (§9), the critical business rules (§10), the phased build order (§11), and MVP acceptance criteria (§12). Read the relevant section before implementing a module. The doc explicitly states there is no legacy code; prior conversations are conceptual reference only.
- `docs/manual-base-atelie-os-instante-ambar.md` — narrative base for an end-user manual (how to *use* the system, not how it's built). Useful for understanding intended UX and operator workflows; not a dev spec.
- `docs/git-workflow.md` — branching rules.

The PRD notes that table/field names in §9 are suggestions — implementation may adjust names but **must preserve the concepts**.

## Git workflow

This directory is not yet a git repo. Once initialized:

- `main` — release branch. Never implement features on it.
- `development` — central integration branch. Branch all work from here.
- Create `feature/<scope>`, `fix/<scope>`, or `chore/<scope>` from `development`; merge back into `development`. Promote `development` → `main` only for releases.

## Recommended stack (PRD §4)

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- React Hook Form + Zod for forms/validation; TanStack Table for complex tables
- PostgreSQL (Neon) via Drizzle ORM
- Better Auth (or equivalent); multi-user from the MVP
- Storage abstraction (local in dev; S3/R2 in prod) for labels, PDFs, receipts, imports, shipping docs
- PDFs via HTML+browser print or a PDF lib; internal labels use **Code128**

## Implementation order (PRD §11)

Build in phases — do not jump ahead, since later modules depend on earlier ones:
Phase 0 base (Next.js, auth, layout, DB, Drizzle, roles, single company, seed, audit + internal-help scaffolding) → 1 core registers (items, categories, units, locations, suppliers, customers, channels, numeric codes, basic labels) → 2 labels/print → 3 stock/purchasing/counts → 4 recipes/pricing/production → 5 orders/pick lists/operation mode → 6 shipping → 7 replenishment/notifications/dashboard → 8 AI text → 9 finance/export/reports → 10 CSV & external channels → 11 help refinement + hardening.

v2.1 added two cross-cutting concerns to wire in early (§11.10): make the app consume **default branding tokens** (CSS variables) and **default workflows** first, then expose advanced editing later.

## Non-obvious architectural invariants

These are the rules most likely to be violated by a naive implementation. Honor them across all modules.

**Multi-tenancy / white-label.** Single-company UI initially, but every table carries `company_id` to allow white-label evolution. No critical color may be hardcoded in operational components — colors come from branding tokens (CSS variables) with a safe fallback. A missing logo must fall back to a text name, never break layout.

**Stock is derived from movements (PRD §3.7, §10.1).** Never edit a balance directly. Every balance is the consequence of `stock_movements` rows. Movements must not drive stock negative without explicit authorization. Distinguish availability states: físico / reservado / disponível / bloqueado / em cura / aguardando revisão / liberado. Product in cure, blocked, or reserved is **not available**.

**Workflows/kanban are configurable; logic must not key off display names (§10.12).** Statuses (e.g. production/order stages) are user-editable rows, not fixed strings like "Em cura". Automations must branch on a stable `technical_key` / `automation_type`, never on the visible label. In-use steps cannot be hard-deleted; history must preserve the step as it was at the time. Replace any hardcoded status list with a query against the active workflow.

**Numeric internal codes + barcodes (PRD §6).** Items etc. get a 12-digit numeric internal code `TTSSNNNNNNNC` (type / subtype / sequence / check digit) used by scanners, *plus* a separate human SKU (e.g. `VEL-LAV-156`) shown to users. Implement a check digit (Luhn/mod-10 or equivalent) and reject invalid/incomplete scans. A lot's code never changes when its status changes — status is DB data.

**Scanner is an accelerator, never a dependency (§3.2, §10.4).** Every scanner action must have an equivalent manual (keyboard/mouse/touch) path. Wrong item or invalid code must block; excess quantity must confirm or block.

**Melhor Envio (shipping) is optional (§3.3, §10.5).** If not configured, the system must still allow manual freight, manual tracking, attaching/printing external label PDFs, and completing orders. API failure must not block manual freight. A chosen quote is saved on the order.

**AI is text-only (§3.5, §10.6).** AI may only generate/rewrite text. No image/video generation, no auto-publishing, no inventing technical data that wasn't entered. Output must be editable before approval.

**Auditing & sensitive data (§10.11, §7.24).** Critical actions (incl. branding/workflow/theme changes, stock adjustments, lot release) produce audit records. Integration tokens are encrypted, never exposed to the frontend, never included in exports; logs mask sensitive data.

**Production & orders.** Creating a production order does not consume stock; consumption happens per the defined rule on finalize, which must record losses and the produced lot's real cost and consumed lots. A shipped order can't be cancelled directly — open an incident; returned product only re-enters availability after review. Lot release requires a user and date.
