# Outstanding Work - consolidated

Updated 2026-06-06 after the recipe approval / test-protocol slice and a full review of `docs/prd-v2.1-atelie-os-instante-ambar.md` against the implemented modules.

This file lists what is still not done. Items already implemented in the local branch are kept out of the backlog even if older session notes mentioned them as future work.

Sections H (PRD coverage gaps) and I (channel/e-commerce integration roadmap) were added in the 2026-06-06 review to map what is left to finalize the MVP and the post-MVP integration direction.

---

## A. Verification debt before merge

- [ ] Manual click-through: Receitas (create + new version), Producao (plan OP, kanban, drawer actions), Pedidos (stepper/status/new order), Operacao (scan order + OP), Etiquetas (item/lote/op/local options), Compras, Financeiro, Relatorios, Incidentes, Auditoria, IA, Configuracoes > Envio.
- [ ] Manual QA - Etiquetas: create sheet model; edit existing model dimensions; change default barcode type and confirm preview; add labels with different barcode types; skip used positions; remove queued label clears stale feedback; browser print renders only label pages.
- [ ] Manual QA - Workflows: load each production preset; rename steps; confirm records stay mapped by technical key; toggle flags/automations; move/archive steps; confirm Pedido drawer stepper reflects configured order flow.
- [ ] Physical barcode validation: Code 128 / Code 39 / EAN-13 / QR on the real printer + scanner. If unreliable, replace the visual renderer with a standards-compliant encoder for print.
- [ ] Regression QA: new order with overstock warning + custom price; payment confirmation; order pick-list barcode handoff into Operacao; production pick-list handoff; recipe version creation; inventory dialogs.
- [ ] Confirm migrated data survives reload, sign-out/sign-in, and a second browser session.
- [ ] Confirm critical writes produce audit rows and role restrictions hold for settings/workflow/label/admin-only writes.

Latest automated verification:

- [x] `npm.cmd run lint` passed on 2026-06-05.
- [x] `npm.cmd run test` passed on 2026-06-05: 33 tests passed.
- [x] `npm.cmd run build` passed on 2026-06-05.

---

## B. Implemented locally and needs product QA

Delivered features are tracked in `feature-log.md` (one line per feature). Everything there exists in the current branch and still needs the product QA listed in section A.

---

## C. Shipping / Melhor Envio remaining work

- [ ] Sandbox QA with at least two tenants and two Melhor Envio accounts.
- [ ] Validate quote payloads against real store package profiles and carrier constraints.
- [ ] Restart dev server and reconnect sandbox OAuth after adding `cart-read cart-write`; Melhor Envio was returning 403 for `/me/cart` without those cart scopes.
- [ ] Validate checkout/payment, async generation, preview, and print against a sandbox label after `/me/cart` is authorized.
- [ ] Map generated Melhor Envio labels to internal orders so webhook events can update tracking/status history automatically.
- [ ] Add explicit reconnect UX for expired refresh tokens.
- [ ] Add integration-level error telemetry without exposing tokens or provider payload secrets.
- [ ] Browser QA customer autocomplete, ViaCEP fill, incomplete-customer warning, and sender profile prefill in label form.
- [ ] Define marketplace import customer identity/dedupe strategy: external buyer id, document, email, phone, and channel precedence.

Notes:

- Manual freight, labels, and tracking must remain available even when Melhor Envio is disconnected or unavailable.
- Official docs confirm the calculate endpoint is `POST /api/v2/me/shipment/calculate` and requires `Accept`, `Content-Type`, `Authorization`, and `User-Agent` headers.

---

## D. Core beta hardening

- [ ] Role policy review for purchases, finance, incidents, recipes, and production.
- [ ] Decide whether inventory permissions need a finer matrix beyond owner/admin write.
- [ ] Add DB-level constraints for positive quantities and valid source/destination expectations where practical.
- [ ] Add inventory movement detail / audit view for manual adjustments and automated stock movements.
- [ ] Add recent-movements filtering by item, type, location, actor, and date range.
- [ ] Add empty-state handling in movement modals for missing blocked location, no active locations, and no catalog items.
- [ ] Decide whether losses require reason categories: breakage, expiration, count correction, production waste.

---

## E. New feature backlog

- [~] Kits — both models implemented; one display gap remains:
  - [x] Assembled: kit recipe with finished-product components + production OP (consume components, output kit with own stock).
  - [x] Virtual: kit-mode flag (`assembled` | `virtual`) on the kit item (Itens form), availability derived from component stock (`/api/app/items`), and order reservation/shipment decomposing the virtual-kit line into component stock movements. Pure planner unit-tested.
  - [x] Pick list and Modo Operacao now list the component products for a virtual-kit order line (`expandKitOrderItems`); `kitMode`/`kitComponents` are exposed on the item directory. Optional: label virtual kits in the order form.
- [ ] Quality control, lots, and checklists:
  - QC checklist per production order.
  - Required loss/approval reasons.
  - Lot traceability from consumed material lots to produced output lots.
  - Block/release stock tied to QC status.
- [ ] Suggested replenishment hardening:
  - Supplier lead time and preferred supplier per item.
  - Sales velocity projection.
  - Turn selected suggestions into a purchase draft.
  - Production-plan suggestions for finished goods.
- [ ] Returns and exchanges:
  - Incident-driven return flow.
  - Restock, loss, refund, or replacement decision.
  - Prevent direct cancellation of shipped orders.
- [ ] External channels and marketplace imports:
  - Import orders.
  - Map external SKUs to catalog items.
  - Sync fulfillment status back to channels.
- [ ] Reports and exports:
  - Production summary export.
  - Date-range filters for existing CSV exports.
  - Saved report presets.
  - Sales / production / purchase trend summaries.
- [ ] AI content hardening:
  - Proper brand-voice settings model.
  - Tenant data context controls.
  - Saved prompt/template management.
  - Approval workflow beyond generated-history persistence.
- [~] Tenant-editable catalog parameters (units of measure, categories):
  - [x] Settings > Catalogo (`/api/app/catalog-settings`) CRUD for units and categories. Only the display name is editable (unit `code` stays the technical key); canonical units (g/kg/ml/l/un...) are protected and entries in use by items cannot be deleted.
  - [ ] Full unit-conversion engine (e.g. 1000 g = 1 kg with factors per kind) so recipes/stock can convert across units — a larger architectural change, deferred.
  - [ ] Item types stay a fixed enum (structural), not tenant-editable.

---

## F. Demo / seed data decision

- [ ] Decide whether to keep named fake people in committed seed data or neutralize them. Runtime fixtures are gone, and seed-only sample data is sanctioned, but older cleanup notes asked to remove named fake people from committed source.

---

## G. Documentation hygiene

- [ ] Refresh `HANDOFF.md`; it still predates the localStorage-removal, recipes/production, core ops, secure integrations, and AI backend work.
- [ ] Re-check `CLAUDE.md` against the real stack after the handoff refresh.
- [ ] Keep `docs/integration-melhor-envio.md` updated as quote, label, and tracking flows move from beta foundation to live integration.

---

## H. PRD coverage gaps (to finalize the MVP)

Modules from the PRD (`prd-v2.1`) that are still missing or only partial, with the section and the MVP acceptance item (§12) they unblock. These are what stand between the current build and a "complete MVP".

- [x] **Pricing and margin** (PRD 7.19 / screen 8.17 / accept. 11-12) — Phase 1 delivered: Precificacao screen + `/api/app/pricing` with cost (active recipe + real average) + labor/extra + desired margin -> suggested price, channel-fee simulation, low-margin alert, save practiced price, and `price_history`. Remaining (Phase 2): persisted per-channel fee rules (config), and a richer labor model.
- [x] **Stock count / contagem** (PRD 7.22 / screen 8.20 / accept. 9) — delivered: Contagem screen + `/api/app/stock-counts` snapshots expected physical per item, operator enters counted, divergence is shown, and only on explicit "Aplicar ajustes" are `adjustment_positive/negative` movements + audit created (`0010`). Pure planner unit-tested. Remaining (Phase 2): per-location counts and loss-reason categories.
- [x] **Lot quality control + post-cure release** (PRD 7.21 / screen 8.18 / accept. 18-19) — delivered: Qualidade screen + `/api/app/quality` list lots in cura/revisao (the production order is the lot unit) and apply a decision against the candle QC checklist: approve -> release (cure->sellable transfer via the existing automation), block -> bloqueada (stays unavailable), or loss -> `loss` movement for the chosen qty. Checklist + decision + user + date recorded on the production metadata + audit. Remaining (future, needs a real `inventory_lots` model): per-lot traceability and approving only part of a lot.
- [x] **Returns / exchanges flow** (PRD 7.20 / screen 8.19 / accept. 25-26) — delivered: incidents no longer move stock on creation; a resolution (`PATCH /api/app/incidents`) decides stock impact (return to available / blocked-for-review / loss / none) and optionally records a refund as a finance entry, then marks the incident resolved (audit `incident.update`, `0011`). Remaining: enforce "shipped orders cannot be cancelled directly" at the order layer (no direct cancel UI exists yet).
- [x] **Data export / backup (CSV portability)** (PRD 7.25 / accept. 38) — delivered: Exportar dados screen + `GET /api/app/export?entity=` returns UTF-8 (BOM) `;`-separated CSV for items, stock, orders, customers, suppliers, and finance, with pt-BR headers, no secrets, and a `report.export` audit row. Remaining: more entities (lots/movements/recipes/production/AI) and role gating for sensitive exports.
- [x] **Notifications / alert engine** (PRD 7.26) — delivered: `GET /api/app/notifications` derives alerts (zero/below-minimum stock, lots awaiting review, paid-not-separated orders, payables) with severity, tone, and an action link; app-root feeds the notif center. Remaining: more rules (stalled orders, ME disconnected, import pending, low margin) and per-rule mute.
- [x] **Marketplace CSV preparation** (PRD 7.14) — delivered on branch `feature/marketplace-imports`: Importar pedidos screen + `/api/app/imports` parse CSV (provider-agnostic column aliases), stage in `import_orders` with raw payload, `channel_sku_mappings` (external SKU -> internal item), import-pending review (unmapped SKU / dedupe by external id), and create internal orders from resolved imports (`0012`). Remaining: attach external label PDF + manual tracking on imported orders; customer dedupe into the customers table. Real provider APIs are section I.
- [ ] **Packaging models + standalone freight calculator** (PRD 7.13) — verify/partial. Needs packaging-model CRUD (dimensions, weight, cost, capacity) and a standalone freight calculator with "copy message for WhatsApp".
- [ ] **Lot traceability** (PRD 7.7 / accept. 32) — partial. Trace which consumed material lots produced which output lot, and store produced-lot real cost.
- [ ] **In-app help completeness** (PRD 7.28 / accept. 40) — partial (a manual module exists). Verify contextual "Como usar esta tela?" per module, first-steps checklist, glossary, and keyword search.

---

## I. Channel and e-commerce integration roadmap (post-MVP)

Requested direction beyond the PRD's CSV-only marketplace prep (PRD 3.4 keeps full APIs out of the MVP). Build all of these on the existing secure pattern: per-tenant encrypted tokens in `integration_credentials`, scoped per provider, never exposed to the frontend, masked in logs, omitted from exports, with connect/disconnect/sync audit events (same model already used for Melhor Envio). Each integration must preserve manual fallback and the marketplace customer dedupe strategy in section C (external buyer id, document, email, phone, channel precedence).

- [~] **Marketplace integrations (real APIs):**
  - Mercado Livre: foundation delivered but paused/backlog for now. Implemented: OAuth/connect (`mercado_livre` encrypted credential, PKCE), `/users/me` status/refresh, webhook stub, manual recent-order sync endpoint (`/api/app/integrations/mercado-livre/sync-orders`) to stage orders in `import_orders`, and SKU mapping verified for item `MLB4746142001` / external SKU `010300001287` -> internal `VEL-LAV-156` with available stock 24. Remaining if resumed: test with real seller orders, customer dedupe, webhook event processing, tracking/status sync, optional stock sync/update to ML.
  - Shopee
  - Amazon
  - TikTok Shop
  - Per provider: OAuth/token connect, order ingestion (-> internal orders with channel/source + raw payload), external-SKU mapping reuse, optional stock sync, and fulfillment/tracking status sync back. Out of scope still: ad publishing, price push, chat/claims, fiscal/NF-e.
- [ ] **E-commerce platform integrations:**
  - Nuvemshop (Tiendanube): OAuth/connect + status foundation delivered (`nuvemshop` encrypted credential, store-id capture, `/store` status check, webhook stub), but API access is plan-gated by Nuvemshop (Escala/Next). Treat as conditional/premium integration, not the default path for small ateliers. CSV import remains the fallback for lower plans. Remaining if pursued: test with real app credentials, order ingestion into `import_orders`, catalog/stock sync, webhooks.
  - WooCommerce
  - Order ingestion + catalog/stock sync via each platform's API/webhooks.
- [ ] **Open platform option (own storefront + ERP):**
  - The site/storefront is a SEPARATE application from this ERP; it integrates over HTTP, not in-process.
  - Expose an authenticated public API and webhooks so the user can build their own site and plug it into the ERP (create/import orders, read catalog/stock/availability, push fulfillment/tracking).
  - Token-scoped per company, audited, rate-limited; same secret-handling rules as above.
  - Lets the user choose between "use a marketplace/e-commerce connector" or "build my own site and integrate with the ERP" without changing the core.
- [x] **Public order tracking API (delivered foundation):** CORS-enabled `GET /api/public/track` (token link or order# + email/CEP) returns a sanitized payment + fulfillment + carrier view for the separate site. It is source-agnostic, so the items below must feed the order's `status` / `paymentStatus` / `tracking` fields rather than a separate tracking store.
- [ ] **Marketplace/channel data ingestion must drive tracking:** when integrations land, order creation/sync must populate payment status, order status, and carrier tracking on the internal order so the public tracking API reflects them automatically.
- [ ] **Public tracking follow-ups:** rate-limiting/abuse protection; company scoping for the order#+email/CEP lookup once a public company identifier (slug) exists for multi-tenant; optional richer status history table if per-event timestamps beyond shipping milestones are needed.

Current integration sequence: Mercado Livre and Nuvemshop foundations exist but are not the immediate product path. Mercado Livre is paused by user decision; Nuvemshop is plan-gated (Escala/Next). Default fallback remains CSV import, and the likely next integration direction is either the open API/storefront path or another channel chosen by product priority.

---

## J. Production readiness (pre-launch, beyond features)

Decisions locked with the user (2026-06-07):

- [ ] **Email via Resend** — wire Resend to send everything: password reset and team invites first (Better Auth e-mail+password is on but has no mail provider today, so recovery/invites do not work). Server-only API key in env.
- [ ] **File storage via Cloudflare R2** — storage abstraction (PRD 4.3) for external label PDFs, attachments, generated documents. S3-compatible client; keys server-only.
- [ ] **Permissions enforcement** — role-gating infra exists (`requireAppRouteContext` has `role`) but is not applied on most routes; enforce the PRD matrix (operator/finance/readonly write limits).
- [ ] **Real-tenant onboarding** — a new company configures units/locations/items without relying on seeds; clear demo/named data (section F).
- [ ] **Deploy** — not a major concern per the user, as long as env is well documented. Keep `.env.example` complete; set real `BETTER_AUTH_SECRET`, `INTEGRATION_SECRETS_KEY`, provider keys in prod.

Hardware (confirmed): only a **barcode reader + A4 printer** for now — no thermal/sticker printer. Internal labels already target A4 sheet layouts (sheet models with cols/rows), so no ZPL/thermal work is needed. Validate print + scan on the real A4 sheets and reader.

---

## Suggested sequencing

1. Manual QA for the current branch.
2. Melhor Envio sandbox validation with two tenants.
3. Validate label checkout/generation/print flow in sandbox.
4. Browser QA customer/store profile flows.
5. Close section H MVP gaps: pricing & margin, stock count, lot QC + post-cure release, data export, returns flow, notifications engine.
6. Marketplace CSV preparation (PRD 7.14).
7. Channel/e-commerce real integrations and/or the open API (section I).
