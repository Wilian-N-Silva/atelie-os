# Atelie OS - Implementation Handoff

Last updated: 2026-06-02 during the audited stock adjustment slice.

## Current Baseline

Atelie OS is a greenfield Next.js backoffice for a small candle atelier, built white-label from day one. The working product language is pt-BR, but this handoff keeps technical notes ASCII-safe.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4 with the ported prototype token/class system
- Better Auth with Drizzle adapter
- Drizzle ORM
- PostgreSQL 17 through Docker Compose for local development

The app has the ported shell, auth flow, onboarding flow, dashboard visual layout, and a DB-backed Items / SKUs register. Backend foundation tables, Better Auth tables, company membership, defaults, seed catalog, stock movements, audit logs, and first app API routes exist.

## Branch Workflow

- `main` is reserved for release promotion.
- `development` is the integration branch.
- Feature work should branch from `development`.
- Current slice is on `feature/items-register`.

The previous split commits should stay as-is: `feat: port design prototype` and `feat: add backend foundation`.

## Local Setup

Run these from the repo root:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Seeded company and owner identity use neutral placeholders by default:

- Company: defaults to `Atelie OS` when `SEED_COMPANY_NAME` is not set
- Name: defaults to `SEED_OWNER_EMAIL` when `SEED_OWNER_NAME` is not set
- Email: `admin@example.com`

Set `SEED_COMPANY_NAME`, `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD` in local `.env` before running `npm run db:seed`. Do not record real seed credentials, company names, or personal names in committed docs, examples, or source defaults.

## Important Files

- `src/db/schema.ts` - Better Auth core tables plus company, membership, defaults, catalog, stock movement, workflow, audit, and help scaffolding.
- `src/db/bootstrap.ts` - default company setup and onboarding company creation.
- `src/db/seed.ts` - idempotent seed owner/company/catalog/stock/audit data.
- `src/lib/auth.ts` - Better Auth server config.
- `src/lib/app-route-context.ts` - server helper for authenticated user, active company, and role.
- `src/app/api/app/session/route.ts` - auth session payload for the client gate.
- `src/app/api/app/dashboard/route.ts` - DB-backed dashboard stock summary.
- `src/app/api/app/items/route.ts` - DB-backed catalog item list with derived stock balances.
- `src/app/api/app/items/[itemId]/stock-adjustment/route.ts` - audited manual stock adjustment endpoint.
- `src/lib/stock-balances.ts` - shared stock movement balance interpretation for app APIs.
- `src/lib/items.ts` - client contract for the Items / SKUs register.
- `src/screens/dashboard.tsx` - keeps prototype dashboard layout and consumes backend low-stock data when available.
- `src/screens/items.tsx` - searchable/sortable Items / SKUs register and detail drawer.

## Foundation Hardening Status

Done in this slice:

- Created `development` from `feature/backend-foundation`.
- Created and switched to `feature/foundation-hardening`.
- Added a shared server app-route context resolver.
- Moved session, onboarding, and demo invite routes to the shared authenticated-user helper.
- Added `GET /api/app/dashboard`.
- Dashboard stock data now comes from `/api/app/dashboard` where safe.
- Dashboard stock summary is derived from `stock_movements`, not item balance fields.
- Seed audit rows are deterministic and do not duplicate across repeated seed runs.
- Seed stock movements are checked by item and deterministic seed source type, so partial seed reruns fill gaps without duplicating existing seed movements.

Verification completed on 2026-06-02:

- `docker compose ps postgres` reported Postgres healthy.
- `npm run db:migrate` applied successfully.
- `npm run db:seed` ran repeatedly without adding duplicate seeded stock movement groups.
- `npm run lint` passed.
- `npm run build` passed.
- Unauthenticated `GET /api/app/dashboard` returned `401`.
- Seeded owner login returned `200` and authenticated `GET /api/app/dashboard` returned `200`.
- A freshly signed-up authenticated user without company membership received `403` on `GET /api/app/dashboard`.

Local database note:

- `.env` may override the placeholder seed owner name, email, and password for local testing.
- The local database already had three historical `seed.run` audit rows per seed entity from earlier pre-hardening seed runs. The new idempotency guard kept that count stable on subsequent runs; it did not delete old audit history.

## Items Register And Stock Adjustment Status

Done in this slice:

- Added `GET /api/app/items`.
- Extracted stock movement interpretation into `src/lib/stock-balances.ts` and reused it from the dashboard endpoint.
- Added a DB-backed `Itens / SKUs` screen behind the existing shell route.
- The screen lists company-scoped catalog items with category, unit, default location, pricing flags, stock health, search, tabs, sorting, and a read-only detail drawer.
- Added a manual stock adjustment modal in the item detail drawer.
- Added `POST /api/app/items/[itemId]/stock-adjustment`.
- Stock adjustments validate active-company item ownership, direction, positive quantity, required reason, and reject negative physical stock.
- Accepted adjustments write one `stock_movements` row and one `stock.adjust` audit row in a transaction, then refresh the Items / SKUs balances.
- Item create/edit flows remain out of scope.

Verification completed on 2026-06-02:

- `npm run lint` passed.
- `npm run build` passed.
- Unauthenticated `GET /api/app/items` returned `401`.
- Unauthenticated `POST /api/app/items/[itemId]/stock-adjustment` returned `401`.

## Product Invariants

- Keep single-company UI for now, but preserve `company_id` on every app query.
- Stock balances are derived from `stock_movements`; do not write editable balance fields.
- Workflows are configurable; logic must use stable `technical_key` / automation metadata, not display labels.
- Internal codes are numeric 12-digit scanner-friendly codes, separate from human SKUs.
- Scanner flows must always have a manual fallback.
- Melhor Envio is optional; manual freight/labels must remain possible.
- AI is text-only and must not auto-publish.
- Critical actions require audit rows; do not expose tokens or sensitive auth internals to the frontend.

## Next Recommended Slice

Finish review for `feature/items-register` first. The next practical product slice is item create/edit: company-scoped catalog form, category/unit/default-location selection, SKU/internal-code validation, audit rows for critical changes, and keeping stock movements separate from editable item metadata.
