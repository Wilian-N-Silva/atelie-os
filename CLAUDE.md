# CLAUDE.md

Guidance for coding agents working in this repository.

## Current State

Atelie OS is a Next.js backoffice for an artisanal candle atelier, built
white-label from day one. The product language is pt-BR.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Better Auth
- Drizzle ORM
- PostgreSQL 17

The app is DB-backed and multi-tenant. Core operational areas exist across
catalog, stock, purchases, recipes, production, quality/lots, orders, labels,
shipping, finance, reports, incidents, audit, AI, help, settings, integrations,
and public tracking. Current beta work is primarily manual QA, tenant isolation
validation, scanner/print validation, standalone/self-hosted validation, and
provider sandbox validation.

Read `HANDOFF.md` before continuing implementation work.

## Source Of Truth

- `docs/README.md` - documentation index.
- `docs/feature-map.md` - feature status, delivered history, launch gates, integrations, deferred scope.
- `docs/prd-v2.1-atelie-os-instante-ambar.md` - product spec and acceptance reference.
- `docs/manual-base-atelie-os-instante-ambar.md` - operator/user flow context.
- `docs/qa-checklist.md` - manual beta QA.
- `docs/git-workflow.md` - branching rules.

The PRD notes that table and field names are suggestions. Preserve the concepts
even when implementation names differ.

## Git Workflow

- `main` is the release branch.
- `development` is the integration branch.
- Branch feature work from `development` using `feature/<scope>`, `fix/<scope>`, or `chore/<scope>`.
- Merge finished work back into `development`.
- Promote `development` to `main` only for releases.

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
npx tsc --noEmit
npm test
npm run build
docker compose ps postgres
```

Seeded company and owner identity use neutral placeholders by default. Set
`SEED_COMPANY_NAME`, `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and
`SEED_OWNER_PASSWORD` in local `.env` before running `npm run db:seed`. Do not
commit real seed credentials, company names, or personal names in examples,
docs, or source defaults.

## Architecture Invariants

Multi-tenancy and white-label:

- Every app table and query must stay company-scoped.
- Use active company context for app routes; never trust client-supplied company IDs without membership validation.
- No critical operational color should be hardcoded in components; use theme tokens/CSS variables.
- Missing logos must fall back to a text company name.
- Standalone/self-hosted mode must not expose public sign-up/onboarding paths.

Stock:

- Stock is derived from `stock_movements`.
- Do not add or edit direct balance fields as source of truth.
- Distinguish physical, reserved, available, blocked, curing, review-pending, and released states.
- Product in cure, blocked, or reserved is not available.
- Lot traceability must preserve consumed lots, produced lot, real cost, user, and date where applicable.

Workflows:

- Workflow/status logic must use stable technical keys or automation metadata.
- Do not key behavior off editable display labels.
- In-use workflow steps should not be hard-deleted.

Codes and scanners:

- Internal codes are numeric codes separate from SKUs.
- Barcode prefixes/ranges may identify entity kind.
- Scanner use is an accelerator, never a dependency.
- Every scanner operation needs a manual equivalent.

Shipping and integrations:

- Melhor Envio is optional.
- Manual freight, external label PDFs, manual tracking, and order completion must still work without integration.
- Integration tokens must be encrypted, masked in logs, omitted from exports, and never sent to the frontend.
- Public tracking must expose only sanitized customer-facing data.

AI:

- AI may generate or rewrite text only.
- No image/video generation, no auto-publishing, and no invented technical data.
- AI output must be editable before approval.

Audit and permissions:

- Critical actions must produce audit records.
- App routes should enforce role policy server-side, not only in UI.

Production and orders:

- Creating a production order does not consume stock.
- Consumption happens on the defined finalization rule and must record losses, consumed lots, produced lot cost, user, and date where applicable.
- A shipped order cannot be cancelled directly; use an incident/return flow.

## Current Backend Notes

- Use `src/lib/app-route-context.ts` for app API authentication and active company resolution.
- Company-scoped app resources should return `401` when unauthenticated and `403` when authenticated without active company access.
- Onboarding/session endpoints may authenticate without requiring an existing company so new users can complete onboarding.
- `src/lib/deployment.ts` centralizes standalone/self-hosted behavior.
- `GET /api/app/dashboard` derives stock summary from `stock_movements`.
- `GET /api/app/items` lists company-scoped catalog items with category, unit, default location, pricing flags, and derived stock balances.
- `POST /api/app/items` and `PUT /api/app/items/[itemId]` create/update item metadata with lookup validation, duplicate SKU/code checks, and audit rows.
- `GET /api/app/inventory` returns company-scoped inventory cards, active locations, item balances, and recent movement history.
- Use `src/lib/stock-balances.ts` for stock movement interpretation in app APIs.
- The known `drizzle-kit` dev-only audit warning is documented; do not run `npm audit fix --force` to downgrade or churn Drizzle Kit.
