# Atelie OS - Implementation Handoff

Last updated: 2026-06-02 during the local Estoque module branch.

## Current Baseline

Atelie OS is a greenfield Next.js backoffice for a small candle atelier, built white-label from day one. The working product language is pt-BR, but this handoff keeps technical notes ASCII-safe.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4 with the ported prototype token/class system
- Better Auth with Drizzle adapter
- Drizzle ORM
- PostgreSQL 17 through Docker Compose for local development

The app has the ported shell, auth flow, onboarding flow, dashboard visual layout, a DB-backed Items / SKUs register, and a local DB-backed Estoque screen in progress. Backend foundation tables, Better Auth tables, company membership, defaults, seed catalog, stock movements, audit logs, and first app API routes exist.

## Branch Workflow

- `main` is reserved for release promotion.
- `development` is the integration branch.
- Feature work should branch from `development`.
- Current local slice is on `feature/inventory-module`.
- No PR is open for the current local slice by request.

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
- `src/app/api/app/items/[itemId]/route.ts` - item metadata update endpoint.
- `src/app/api/app/items/[itemId]/movements/route.ts` - recent stock movement history for one item.
- `src/app/api/app/items/[itemId]/stock-adjustment/route.ts` - audited manual stock adjustment endpoint.
- `src/app/api/app/inventory/route.ts` - DB-backed inventory overview with optional location filter.
- `src/lib/stock-balances.ts` - shared stock movement balance interpretation for app APIs.
- `src/lib/items-server.ts` - server-side item list shaping, form validation, lookup validation, duplicate checks, and audit writes.
- `src/lib/items.ts` - client contract for the Items / SKUs register.
- `src/lib/inventory-server.ts` - server-side inventory overview shaping.
- `src/lib/inventory.ts` - client contract for the Estoque screen.
- `src/screens/dashboard.tsx` - keeps prototype dashboard layout and consumes backend low-stock data when available.
- `src/screens/items.tsx` - searchable/sortable Items / SKUs register and detail drawer.
- `src/screens/inventory.tsx` - searchable/sortable inventory balances and recent movements.

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

## Items / SKUs Module Status

Done in PR #2 (`feature/items-register`):

- Added `GET /api/app/items`.
- Extracted stock movement interpretation into `src/lib/stock-balances.ts` and reused it from the dashboard endpoint.
- Added a DB-backed `Itens / SKUs` screen behind the existing shell route.
- The screen lists company-scoped catalog items with category, unit, default location, pricing flags, stock health, search, tabs, sorting, and a read-only detail drawer.
- Added a manual stock adjustment modal in the item detail drawer.
- Added `POST /api/app/items/[itemId]/stock-adjustment`.
- Stock adjustments validate active-company item ownership, direction, positive quantity, required reason, and reject negative physical stock.
- Accepted adjustments write one `stock_movements` row and one `stock.adjust` audit row in a transaction, then refresh the Items / SKUs balances.
- Added item create/edit form in the Items / SKUs screen.
- Added `POST /api/app/items` and `PUT /api/app/items/[itemId]`.
- Item create/edit validates active-company category/unit/default-location lookups, 12-digit internal code, SKU/name, duplicate SKU/code, and writes `item.create` / `item.update` audit rows.
- Added migration `drizzle/0001_sudden_machine_man.sql` for `item.create` and `item.update` audit enum values.
- Stock movements remain separate from editable item metadata.
- Added `GET /api/app/items/[itemId]/movements`.
- The item drawer shows recent stock movements with type, quantity, reason, source, actor, and date.

Verification completed on 2026-06-02:

- `npm run db:migrate` applied `drizzle/0001_sudden_machine_man.sql` locally.
- `npm run lint` passed.
- `npm run build` passed.
- Unauthenticated `GET /api/app/items` returned `401`.
- Unauthenticated `POST /api/app/items` returned `401`.
- Unauthenticated `PUT /api/app/items/[itemId]` returned `401`.
- Unauthenticated `GET /api/app/items/[itemId]/movements` returned `401`.
- Unauthenticated `POST /api/app/items/[itemId]/stock-adjustment` returned `401`.

## Estoque Module Status

Done locally on `feature/inventory-module`:

- Added `GET /api/app/inventory`.
- Added `src/lib/inventory.ts` and `src/lib/inventory-server.ts`.
- Extended `src/lib/stock-balances.ts` so app APIs can request company-wide balances or balances scoped to one inventory location.
- Wired the existing `estoque` shell route to `src/screens/inventory.tsx`.
- The Estoque screen shows aggregate stock cards, active-location filtering, search, tabs, sorting, item/location balances, and recent stock movement history.
- Inventory rows navigate into the Items / SKUs drawer for item details and stock adjustment.
- No schema migration was required for this slice.

Verification completed on 2026-06-02:

- `npm run lint` passed.
- `npm run build` passed.
- Unauthenticated `GET /api/app/inventory` returned `401`.

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

Continue the current `feature/inventory-module` branch until the Estoque module is ready as a module-sized PR. The next practical step inside this module is adding direct manual movement workflows for purchase entry, transfer, loss, block, and release, reusing item/location validation and audit logging.
