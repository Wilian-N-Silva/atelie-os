# Feature Log — Atelie OS

> Branch `feature/marketplace-imports` adds the marketplace ingestion foundation (below, 2026-06-07): `Importar pedidos` screen + `/api/app/imports` (CSV parse, `channel_sku_mappings`, `import_orders` staging, create internal orders from resolved imports; `0012`). Provider-agnostic — real ML/Nuvemshop/Shopee API connectors come next on the same branch.


Concise record of delivered features. Replaces the verbose per-session logs.
For pending work see `outstanding-work.md`; for the product spec see `prd-v2.1-atelie-os-instante-ambar.md`.

One line per feature. Migrations are noted as `0NNN`.

## 2026-06-04 — localStorage removal, DB-backed core
- Recipes and production moved to DB (`recipes`, `recipe_versions`, `recipe_components`, `production_orders`); `0003`.
- Order/production status display driven by company workflows (`workflow-status.ts`); hardcoded status maps removed.
- Default workflows seeded into DB; orders API accepts any `^[a-z0-9_]{1,64}$` technical status key.
- Runtime demo data purged (demo data lives only in seeds); `screen-fixtures.ts` -> `domain.ts`; `Demo*` types renamed.
- `item-directory.ts` hook backs screens with real cost/availability; notifications in-memory only.

## 2026-06-05 — Core ops, secure integrations, AI backend
- Workflow stock automations for orders/production (reserve / ship / consume / output / release) keyed off automation metadata; unit-tested.
- Read-only audit-log screen + `/api/app/audit-logs`.
- Core ops modules + APIs: suppliers, purchases, finance, reports, incidents, shipping settings; `0004`, `0005`.
- BRL currency mask helpers.
- Melhor Envio secure multi-tenant OAuth: encrypted `integration_credentials` (AES-256-GCM), signed OAuth state, connect/disconnect; tokens never reach the frontend.
- Bundled OpenAI text generation: server-only key, local fallback, `ai_generations` history, `ai.generate`/`ai.approve` audit.

## 2026-06-05 — Shipping, customers, store profile
- Melhor Envio live: real quote (calculate API) with refresh-token retry; cart insert; label checkout/generate/preview/print; signed webhook (`X-ME-Signature`).
- Selected quote persisted on the order (carrier/service/price/deadline); order total recalculated.
- Customers: `customers` table + `orders.customer_id`; order creation searches/creates/updates customer; ViaCEP proxy; channel/source kept for future marketplace import; `0006`.
- Store/sender/fiscal profile in Settings > Envio; multiple sender/origin address cards; sender CPF/CNPJ validation.
- Order detail rebuilt as a full page with a step-based shipping flow; new-order screen gained an inline freight quote.
- Product logistics on `ItemSummary` (weight/dimensions + packed); sellable items require logistics.

## 2026-06-06 — Tracking, dedicated order screen, recipe approval
- Tracking persistence: webhook and the `generate` action write tracking/status back onto the order (matched by `externalId`), mirrored to `orders.tracking`; webhook audit is now company-scoped.
- Order detail opens as a dedicated screen (early-return), not a panel under the list.
- Recipe approval flow + quality protocol: `recipe_tests` with a 12-digit scannable code and the 5 criteria (aroma frio/quente, queima, acabamento, consistencia), each status + note; derived result; approval gated on >=1 passed test; barcode-only printable label; fillable in Modo Operacao by scan plus a manual modal; `0007`.
- Production kanban "Avancar" shortcut removed so OPs cannot skip operation steps.
- Dev DB pool `max` 1 -> 10 (a single connection deadlocked transactional routes and login); `recipe-tests` route uses the `tx` client inside transactions.

## 2026-06-06 — Pricing & margin; kit composition
- Pricing screen + `GET/POST /api/app/pricing`: per-product cost (active-recipe materials/packaging, real average cost overriding estimate) + labor/extra + desired margin -> suggested price; channel-fee simulation; low-margin alert; save practiced price -> `price_history` + `price.update` audit; `0009`. Pure math in `src/lib/pricing.ts` (5 tests, incl. the PRD 26,10 -> 65,25 example).
- Kit recipes can now use finished products as components (e.g. 3 velas + caixa = Kit Ritual Noturno), enabling assembled kits via a production OP (consume components, output kit).
- Virtual-bundle kits: kit-mode flag (`assembled` | `virtual`) on the item, availability derived from component stock, and order reservation/shipment decomposing a virtual-kit line into component stock movements. Pure planner in `src/lib/kit-composition.ts` (unit-tested); composition resolved from the kit's active recipe in `src/lib/kit-composition-server.ts`. Pick list and Modo Operacao expand virtual-kit lines into component products (`expandKitOrderItems`); `kitMode`/`kitComponents` exposed on the item directory.
- Stock count (contagem): Contagem screen + `/api/app/stock-counts` snapshot expected physical, capture counted, show divergence, and apply adjustments only on confirmation (`adjustment_positive/negative` movements + audit). `0010`. Pure planner in `src/lib/stock-count.ts` (unit-tested).
- Lot quality control (Qualidade): Qualidade screen + `/api/app/quality` review lots in cura/revisao with the candle QC checklist; approve -> release (cure->sellable), block, or register loss (`loss` movement). Checklist/decision/user/date recorded on the production order + audit. The production order is the lot unit (no `inventory_lots` table yet).
- Data export (Exportar dados): screen + `GET /api/app/export?entity=` returns UTF-8 BOM `;`-CSV for items, stock, orders, customers, suppliers, finance, with pt-BR headers, no secrets, and a `report.export` audit row. CSV builder in `src/lib/csv.ts`.
- Notifications engine: `GET /api/app/notifications` derives alerts (zero/below-min stock, lots to review, paid-not-separated orders, payables) with severity/tone/action; app-root feeds the notif center (no persistence).
- Returns/exchanges: incidents no longer move stock on creation; resolution (`PATCH /api/app/incidents`) decides stock impact (available / blocked / loss / none) and optional refund (finance entry), then marks resolved (audit `incident.update`, `0011`). Resolve UI in the incidents screen.
- Tenant catalog settings: Configuracoes > Catalogo + `/api/app/catalog-settings` CRUD for units and categories. Only the display name is editable (unit `code` is the stable technical key); canonical units are protected and in-use entries cannot be deleted. Full unit-conversion engine deferred.

## 2026-06-06 — Public order tracking API (foundation)
- Public, CORS-enabled, read-only endpoint `GET /api/public/track` for the (separate) company website to consume from another origin. Lookup by opaque `track_token` (shareable link) or by order number + email/CEP (email/CEP is the auth factor). `0008` adds unique `orders.track_token`, backfilled and generated on order creation.
- Sanitized payload (no PII/costs/tokens): order number, payment status, customer-friendly fulfillment stage + timeline (recebido -> em preparacao -> embalado -> enviado -> em transito -> entregue), and carrier/tracking code/url/ETA. Generic 404 so existence cannot be probed.
- Source-agnostic by design: reads the order's own `status` / `paymentStatus` / `tracking` fields, so manual entry, Melhor Envio, or future marketplace ingestion all feed the same customer view.
- Melhor Envio webhook now persists posted/delivered milestones onto the order to enrich the timeline.
- `src/lib/public-tracking.ts` holds the pure stage mapping + timeline builder (reusable by the external site).

## 2026-06-07 — Navigation slimming
- Sidebar groups are collapsible (state persisted in `atelie-nav-collapsed`); the group with the active screen stays open.
- Moved screens off the top level into their parents to cut clutter (each keeps its route + command-palette entry): Exportar dados -> a Configuracoes tab; Contagem -> a "Contagem completa" button in Estoque; Qualidade -> a button in Producao; Importar pedidos -> an "Importar" button in Pedidos.
- Branch note: `feature/marketplace-imports` merged `feature/remove-localstorage-persistence` to pick up the slimmer nav; the marketplace "Importar pedidos" item was consolidated into Pedidos here.

## 2026-06-07 - Mercado Livre connector foundation
- Mercado Livre OAuth foundation: `/api/app/integrations/mercado-livre/oauth/start` + callback with PKCE (`S256`), signed state, encrypted tokens in `integration_credentials` under provider `mercado_livre`, and audited connect attempts.
- Connection status endpoint: `/api/app/integrations/mercado-livre/status` reads credential state, refreshes near-expiry/401 tokens, and validates the token against Mercado Livre `/users/me` without exposing secrets.
- Public webhook stub: `/api/webhooks/mercado-livre` responds quickly with `200` for DevCenter validation; real event/order processing remains pending.
- Verified locally on 2026-06-07 with ngrok: token stored as `connected`, `externalUserId` captured, `/users/me` returned `200`.
- Manual order-sync endpoint: `/api/app/integrations/mercado-livre/sync-orders` fetches recent seller orders from `/orders/search`, normalizes lines into the existing import staging shape, dedupes by external order id, and writes `import_orders` as `ready` or `pending` based on `channel_sku_mappings`. Verified API call returned `200` with zero current orders on the connected account.

## 2026-06-07 - Nuvemshop connector foundation
- Nuvemshop OAuth foundation: `/api/app/integrations/nuvemshop/oauth/start` + callback, signed state, encrypted tokens in `integration_credentials` under provider `nuvemshop`, and audited connect attempts.
- Connection status endpoint: `/api/app/integrations/nuvemshop/status` reads credential state and validates the token against Nuvemshop `GET /v1/{store_id}/store` with the required `User-Agent` header.
- Public webhook stub: `/api/webhooks/nuvemshop` responds quickly with `200`; real event/order processing remains pending.

## 2026-06-25 - Beta feature closure and tenant hardening
- Packaging profiles and standalone freight calculator delivered: package CRUD, quote outside the order flow, and copyable WhatsApp message.
- Production lot traceability expanded: material-lot selection, produced-lot real cost, inventory-lot records, quality outcome, partial release/loss, and trace rows in production.
- Pending MVP/partial features closed: contextual help/search/checklist, unit conversion, expanded reports/exports, AI settings/templates/approval, notification rules/mutes, pricing channel/labor rules, per-location stock counts, returns/replacements, and marketplace CSV follow-ups.
- Label printing/editor follow-ups closed: tenant label templates, default barcode type, circular thermal sheet definitions, server-side normalization, and persistence across sessions.
- Public tracking hardened with rate limiting and company-scoped manual lookup.
- Production readiness infrastructure added: Resend email, R2 storage abstraction, route permission enforcement, real-tenant bootstrap defaults, and production seed guard.
- Tenant isolation hardened for labels, themes, and team access; active company context is stored explicitly and server routes scope tenant settings.
- Standalone/self-hosted mode added: public app config, sign-up/onboarding blocking, custom login copy, and env flags for client-owned subdomain deployments.
