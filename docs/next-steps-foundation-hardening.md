# Next Steps: Foundation Hardening

## Summary

Proceed with a foundation-first slice. The goal is to make the current Next 16 + Better Auth + Drizzle/Postgres baseline reliable, documented, and ready for screen-by-screen product work from `development`.

## Key Changes

- Git workflow:
  - Keep current split commits as-is: `feat: port design prototype` then `feat: add backend foundation`.
  - Create `development` from `feature/backend-foundation` as the initial integration branch.
  - Start the next work on `feature/foundation-hardening` from `development`.
  - Keep `main` for the first release promotion, not day-to-day feature work.

- Documentation cleanup:
  - Update `HANDOFF.md` and `CLAUDE.md` to reflect the actual current stack: Next 16, React 19, Tailwind 4, Better Auth, Drizzle, PostgreSQL 17.
  - Remove stale notes about mock localStorage auth and Next 14.
  - Add exact local setup commands: `docker compose up -d postgres`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`.

- Backend hardening:
  - Make seed fully idempotent for user, company, membership, defaults, catalog, stock movements, and audit rows.
  - Add a small authenticated server helper for current user, active company, and role.
  - Ensure app API routes consistently return `401` for unauthenticated users and `403` for authenticated users without company access.
  - Keep single-company UI for now, but preserve `company_id` on every app query.

- First DB-backed UI step:
  - Replace dashboard-only placeholder assumptions with a minimal `/api/app/dashboard` endpoint.
  - Derive stock summary from `stock_movements`, not item balance fields.
  - Keep existing visual dashboard layout; only swap the data source from local placeholder data to backend response where safe.

## Public Interfaces

- Add `GET /api/app/dashboard`.
- Require a Better Auth session.
- Use the active company from membership.
- Return dashboard cards, alerts, and stock summary data in the shape already convenient for the current dashboard component.
- Add a server-only session/company resolver for app API routes.
- Do not expose tokens or sensitive auth internals to the frontend.

## Test Plan

- Run `docker compose up -d postgres`.
- Run `npm run db:migrate`.
- Run `npm run db:seed` twice to verify idempotency.
- Run `npm run lint`.
- Run `npm run build`.
- Login with seeded owner credentials.
- Confirm session persists through refresh.
- Confirm dashboard loads from the API.
- Confirm unauthenticated `/api/app/dashboard` returns `401`.
- Confirm Postgres remains healthy with `docker compose ps postgres`.

## Assumptions

- The next slice should prioritize correctness and workflow hygiene over porting more screens.
- The existing visual design should remain unchanged unless backend integration requires a small loading or error state.
- The remaining `drizzle-kit` dev-only audit warning is documented for now; do not downgrade Drizzle Kit with `npm audit fix --force`.
