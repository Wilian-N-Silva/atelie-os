# Atelie OS - Implementation Handoff

Last updated: 2026-06-05 on `feature/remove-localstorage-persistence`.

## Current Baseline

Atelie OS is a Next.js backoffice for small artisan operations, built white-label and multi-tenant from day one. The working product language is pt-BR. Technical notes in this file stay ASCII-safe.

Current stack:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4 with the ported prototype token/class system
- Better Auth with Drizzle adapter
- Drizzle ORM
- PostgreSQL 17 through Docker Compose for local development

The active local branch has moved well past the original inventory slice. The app now has DB-backed auth, onboarding, dashboard, items/SKUs, inventory, orders, recipes, production, labels, workflows, audit logs, suppliers, purchases, finance, reports, incidents, shipping settings, and backend AI text generation.

## Branch Workflow

- `main` is reserved for release promotion.
- `development` is the integration branch.
- Feature work should branch from `development`.
- Current local slice is on `feature/remove-localstorage-persistence`.
- No PR is open for the current local slice unless opened separately by the user.

The working tree may contain unrelated design prototype edits under `design/**`. Keep those separate from app commits unless explicitly syncing the prototype.

## Local Setup

Run these from the repo root:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Seeded company and owner identity use `.env` values:

- `SEED_COMPANY_NAME`
- `SEED_OWNER_NAME`
- `SEED_OWNER_EMAIL`
- `SEED_OWNER_PASSWORD`

Do not record real seed credentials, company names, or personal names in committed docs, examples, or source defaults.

## Environment Notes

Secure integrations are server-side only:

- `INTEGRATION_SECRETS_KEY` encrypts provider credentials. In local development the app can fall back to auth secrets, but production must configure a strong value.
- `OPENAI_API_KEY` and `OPENAI_TEXT_MODEL` power bundled text generation. Tenants do not provide OpenAI keys.
- `MELHOR_ENVIO_CLIENT_ID`, `MELHOR_ENVIO_CLIENT_SECRET`, `MELHOR_ENVIO_REDIRECT_URI`, and optional Melhor Envio endpoint envs configure OAuth.
- `MELHOR_ENVIO_USER_AGENT` should identify the app and technical contact for provider API calls.

## Important Files

- `src/db/schema.ts` - Better Auth tables plus tenant, catalog, stock, workflow, audit, core ops, integrations, and AI tables.
- `src/db/bootstrap.ts` - default company setup and onboarding company creation.
- `src/db/seed.ts` / `src/db/seed-data.ts` - idempotent seeded tenant data.
- `src/lib/app-route-context.ts` - authenticated app route context and role helper.
- `src/lib/permissions.ts` - shared role sets.
- `src/lib/stock-balances.ts` / `src/lib/stock-balance-math.ts` - stock movement interpretation.
- `src/lib/workflows.ts` / `src/lib/workflow-status.ts` - configurable workflow contracts and display mapping.
- `src/lib/workflow-automations-server.ts` - order/production stock automation writes.
- `src/lib/shipping-integrations-server.ts` - Melhor Envio OAuth credentials, refresh-token handling, and quote client.
- `src/lib/integration-secrets-server.ts` - AES-256-GCM secret encryption helper.
- `src/lib/core-ops-client.ts` - client contracts for suppliers, purchases, finance, and incidents.
- `src/app/api/app/shipping/route.ts` - shipping settings, quote endpoint, and disconnect flow.
- `src/app/api/app/ai/generate/route.ts` - backend-only AI generation and approval endpoint.
- `src/screens/settings.tsx` - branding, users, workflows, labels, and shipping settings.

## Implemented Product Areas

Done locally:

- Auth, onboarding, company membership, and active-company route context.
- DB-backed dashboard summary.
- DB-backed Items / SKUs register with create/edit and stock adjustment.
- DB-backed inventory overview and movement history.
- DB-backed branding, workflows, label settings, orders, recipes, and production.
- Runtime business fixture purge; sanctioned sample data now lives in seeds.
- DB-driven order and production status presentation.
- Order and production stock automations tied to workflow technical keys.
- Audit-log screen.
- Suppliers and purchases.
- Suggested replenishment API and screen using stock minimums, available balances, open order demand, and open production material demand.
- Managerial finance.
- Simple reports.
- Incidents / returns foundation.
- Secure Melhor Envio OAuth foundation with encrypted per-tenant tokens.
- Melhor Envio quote endpoint using the external calculate API, token refresh retry, and manual fallback.
- Selected Melhor Envio quotes can be applied to orders and persisted with carrier, service, price, deadline, and timestamp.
- Selected Melhor Envio quotes can be inserted into the Melhor Envio cart from the order drawer, persisting external label id/protocol/status on the order.
- Saved Melhor Envio labels expose checkout, generate, preview, and print actions from the order drawer.
- Melhor Envio webhook endpoint with `X-ME-Signature` validation and audit logging for signed label events.
- Customer base foundation with `customers`, `orders.customer_id`, customer autocomplete during order creation, channel/source metadata, and ViaCEP address lookup.
- Store/sender/fiscal profile fields in shipping settings, reused by Melhor Envio label sender inputs.
- Sellable item logistics validation and order quote defaults from item package weight/dimensions.
- Backend OpenAI text generation with persisted generation history and approval audit.

## Product Invariants

- Preserve `company_id` on every app query.
- Stock balances are derived from `stock_movements`; do not write editable balance fields.
- Workflows are configurable; logic must use stable `technical_key` / automation metadata, not display labels.
- Internal codes are numeric 12-digit scanner-friendly codes, separate from human SKUs.
- Scanner flows must always have a manual fallback.
- Melhor Envio is optional; manual freight/labels/tracking must remain possible.
- Provider tokens, OpenAI keys, OAuth client secrets, and refresh tokens must never be exposed to the browser.
- AI is text-only and must not auto-publish.
- Critical writes require audit rows.

## Latest Verification

Completed on 2026-06-05 after the Melhor Envio quote persistence slice:

- `npm.cmd run lint` passed.
- `npm.cmd run test` passed: 33 tests, 0 failed.
- `npm.cmd run build` passed.
- Functional ngrok test passed against `https://ablutionary-unvesiculated-marylynn.ngrok-free.dev`: applying a Jadlog `.Com` quote persisted freight `15.96` and recalculated order total to `158.96`.
- Functional ngrok cart insertion reached Melhor Envio but returned provider 403 `This action is unauthorized.` even after reconnect. Follow-up docs/community check indicates `/me/cart` also needs `cart-read` and `cart-write`; these scopes were added to `.env`, `.env.example`, code fallback, and integration docs. Restart dev server, ensure the Melhor Envio app permits those cart scopes, then reconnect OAuth.
- Functional ngrok customer/order test passed: ViaCEP returned HTTP 200, new order persisted `customerId`, customer was saved, and complete data produced `customerIncomplete=false`.

Manual browser QA is still required before merge. See `docs/outstanding-work.md`.

## Next Recommended Slice

Finish the shipping path in this order:

1. Sandbox QA with two tenants and two Melhor Envio accounts.
2. Restart dev server, enable/confirm `cart-read` and `cart-write` in Melhor Envio, reconnect OAuth, and rerun cart insertion.
3. Validate label checkout/payment, async generation, preview, and print.
4. Browser QA customer autocomplete, ViaCEP fill, sender profile, and sellable logistics validation.
5. Persist Melhor Envio label IDs on internal orders so webhook events can update tracking/status history.

After shipping, prioritize QC/lots/checklists, replenishment-to-purchase drafts, returns/exchanges hardening, and marketplace imports.
