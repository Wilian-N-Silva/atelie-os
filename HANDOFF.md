# Atelie OS - Implementation Handoff

Last updated: 2026-06-02 during the foundation-hardening slice.

## Current Baseline

Atelie OS is a greenfield Next.js backoffice for a small candle atelier, built white-label from day one. The working product language is pt-BR, but this handoff keeps technical notes ASCII-safe.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4 with the ported prototype token/class system
- Better Auth with Drizzle adapter
- Drizzle ORM
- PostgreSQL 17 through Docker Compose for local development

The app has the ported shell, auth flow, onboarding flow, and dashboard visual layout. Backend foundation tables, Better Auth tables, company membership, defaults, seed catalog, stock movements, audit logs, and first app API routes exist.

## Branch Workflow

- `main` is reserved for release promotion.
- `development` is the integration branch.
- Feature work should branch from `development`.
- This slice is on `feature/foundation-hardening`.

The previous split commits should stay as-is: `feat: port design prototype` and `feat: add backend foundation`.

## Local Setup

Run these from the repo root:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Seeded owner email uses a placeholder by default:

- Email: `admin@example.com`

Set `SEED_OWNER_PASSWORD` in local `.env` before running `npm run db:seed`. Do not record real seed credentials in committed docs, examples, or source defaults.

## Important Files

- `src/db/schema.ts` - Better Auth core tables plus company, membership, defaults, catalog, stock movement, workflow, audit, and help scaffolding.
- `src/db/bootstrap.ts` - default company setup and onboarding company creation.
- `src/db/seed.ts` - idempotent seed owner/company/catalog/stock/audit data.
- `src/lib/auth.ts` - Better Auth server config.
- `src/lib/app-route-context.ts` - server helper for authenticated user, active company, and role.
- `src/app/api/app/session/route.ts` - auth session payload for the client gate.
- `src/app/api/app/dashboard/route.ts` - DB-backed dashboard stock summary.
- `src/screens/dashboard.tsx` - keeps prototype dashboard layout and consumes backend low-stock data when available.

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

- `.env` may override the placeholder seed credentials for local testing.
- The local database already had three historical `seed.run` audit rows per seed entity from earlier pre-hardening seed runs. The new idempotency guard kept that count stable on subsequent runs; it did not delete old audit history.

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

Finish verification for this foundation-hardening branch first. After that, continue screen-by-screen from the product build order rather than porting every remaining screen at once. The next practical product slice is usually one core register screen backed by company-scoped DB queries, keeping the existing prototype styles intact.
