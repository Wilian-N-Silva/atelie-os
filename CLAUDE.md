# CLAUDE.md

Guidance for coding agents working in this repository.

## Current State

Atelie OS is a Next.js backoffice for an artisanal candle atelier, built white-label from day one. The product language is pt-BR.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Better Auth
- Drizzle ORM
- PostgreSQL 17

The design prototype has been ported into the shell, auth flow, onboarding flow, dashboard, a DB-backed Items / SKUs register, and a local DB-backed Estoque screen in progress. The backend foundation is in place with Better Auth tables, company membership, defaults, seed data, stock movements, workflow scaffolding, audit logs, and app API routes.

Read `HANDOFF.md` before continuing implementation work.

## Source of Truth

- `docs/prd-v2.1-atelie-os-instante-ambar.md` - authoritative product spec.
- `docs/manual-base-atelie-os-instante-ambar.md` - operator/user flow context.
- `docs/git-workflow.md` - branching rules.
- `docs/outstanding-work.md` - consolidated list of remaining/open work.

The PRD notes that table and field names are suggestions. Preserve the concepts even when implementation names differ.

## Git Workflow

- `main` is the release branch.
- `development` is the integration branch.
- Branch feature work from `development` using `feature/<scope>`, `fix/<scope>`, or `chore/<scope>`.
- Merge finished work back into `development`.
- Promote `development` to `main` only for releases.

Current local module work is on `feature/inventory-module`. No PR is open for that branch by request.

## Local Setup

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Useful checks:

```powershell
npm run lint
npm run build
docker compose ps postgres
```

Seeded company and owner identity use neutral placeholders by default:

- Company: defaults to `Atelie OS` when `SEED_COMPANY_NAME` is not set
- Name: defaults to `SEED_OWNER_EMAIL` when `SEED_OWNER_NAME` is not set
- Email: `admin@example.com`

Set `SEED_COMPANY_NAME`, `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD` in local `.env` before running `npm run db:seed`. Do not commit real seed credentials, company names, or personal names in examples, docs, or source defaults.

## Architecture Invariants

Multi-tenancy and white-label:

- Single-company UI is acceptable now, but every app table and query must stay company-scoped.
- No critical operational color should be hardcoded in components; use theme tokens/CSS variables.
- Missing logos must fall back to a text company name.

Stock:

- Stock is derived from `stock_movements`.
- Do not add or edit direct balance fields as source of truth.
- Distinguish physical, reserved, available, blocked, curing, review-pending, and released states.
- Product in cure, blocked, or reserved is not available.

Workflows:

- Workflow/status logic must use stable technical keys or automation metadata.
- Do not key behavior off editable display labels.
- In-use workflow steps should not be hard-deleted.

Codes and scanners:

- Internal codes are 12-digit numeric codes separate from SKUs.
- Scanner use is an accelerator, never a dependency.
- Every scanner operation needs a manual equivalent.

Shipping:

- Melhor Envio is optional.
- Manual freight, external label PDFs, manual tracking, and order completion must still work without integration.

AI:

- AI may generate or rewrite text only.
- No image/video generation, no auto-publishing, and no invented technical data.
- AI output must be editable before approval.

Audit and sensitive data:

- Critical actions must produce audit records.
- Integration tokens must be encrypted, masked in logs, omitted from exports, and never sent to the frontend.

Production and orders:

- Creating a production order does not consume stock.
- Consumption happens on the defined finalization rule and must record losses, consumed lots, produced lot cost, user, and date where applicable.
- A shipped order cannot be cancelled directly; use an incident/return flow.

## Current Backend Notes

- Use `src/lib/app-route-context.ts` for app API authentication and active company resolution.
- Company-scoped app resources should return `401` when unauthenticated and `403` when authenticated without active company access.
- Onboarding/session endpoints may authenticate without requiring an existing company so new users can complete onboarding.
- `GET /api/app/dashboard` derives stock summary from `stock_movements`.
- `GET /api/app/items` lists company-scoped catalog items with category, unit, default location, pricing flags, and derived stock balances.
- `POST /api/app/items` and `PUT /api/app/items/[itemId]` create/update item metadata with lookup validation, duplicate SKU/code checks, and `item.create` / `item.update` audit rows.
- `GET /api/app/items/[itemId]/movements` lists recent stock movements for one company-scoped item.
- `POST /api/app/items/[itemId]/stock-adjustment` records manual positive/negative stock adjustments as `stock_movements` plus `stock.adjust` audit rows.
- `GET /api/app/inventory` returns company-scoped inventory cards, active locations, item balances, and recent movement history, with optional `locationId` filtering.
- Use `src/lib/stock-balances.ts` for stock movement interpretation in app APIs.
- `src/lib/stock-balances.ts` supports both company-wide and location-scoped balance views; preserve company-scoped behavior for dashboard/items callers.
- The known `drizzle-kit` dev-only audit warning is documented; do not run `npm audit fix --force` to downgrade or churn Drizzle Kit.
