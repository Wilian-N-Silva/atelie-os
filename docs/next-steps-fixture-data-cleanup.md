# Next Steps: Fixture Data Cleanup

## Summary

The active app should not import prototype fixture modules. Seed-only catalog and stock records belong beside the database seed script, while non-DB-backed screens should use company-scoped APIs or neutral empty states until their tables exist.

## Key Changes

- Keep `src/lib/data.ts` deleted; do not reintroduce client-side business fixtures.
- Keep seed catalog data in `src/db/seed-data.ts`, owned by `src/db/seed.ts`.
- Move notification data behind app APIs, or keep only neutral empty states until the related modules are DB-backed.
- Remove named fake customers, operators, invitees, and production assignees from committed source defaults.
- Preserve seeded catalog/stock data for development, but keep company and owner identity sourced from `SEED_COMPANY_NAME`, `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and local-only `SEED_OWNER_PASSWORD`.

## Public Interfaces

- Extend `/api/app/dashboard` beyond stock summary only when order/production tables exist.
- Add small read endpoints per screen as each module becomes DB-backed; keep all app queries company-scoped through `src/lib/app-route-context.ts`.

## Test Plan

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run db:seed` with local `SEED_COMPANY_NAME`, `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD`.
- Search committed app source for named fake people before publishing.
- Confirm the dashboard and account menu show the authenticated session user's name.

## Assumptions

- Product docs may keep Instante Ambar examples because they are source-of-truth business context.
- Prototype fixture files should not be imported by the active app.
- The cleanup should proceed screen-by-screen rather than attempting to model every remaining domain table at once.
