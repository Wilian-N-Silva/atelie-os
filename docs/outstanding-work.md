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
- [ ] Tenant-editable catalog parameters (units of measure, material/item types, etc.):
  - These reference tables already exist in the DB but are not editable from the UI; expose them in tenant settings.
  - Protect canonical measurement standards and conversions (e.g. 1000 g = 1 kg) so edits cannot break unit math.
  - Keep behavior keyed off stable technical keys, not editable display labels (same invariant as workflows).

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

- [ ] **Pricing and margin** (PRD 7.19 / screen 8.17 / accept. 11-12) — not built. Needs: per-product suggested price from active recipe cost + packaging + loss + channel fee + desired margin; channel fee rules; save practiced price; low-margin alert; price-change history. No `pricing` screen or API exists today.
- [ ] **Stock count / contagem** (PRD 7.22 / screen 8.20 / accept. 9) — not built. Direct adjustments exist, but not the count flow: expected vs counted -> divergence -> confirm adjustment with justification -> movement + audit. No automatic balance change.
- [ ] **Lot quality control + post-cure release** (PRD 7.21 / screen 8.18 / accept. 18-19) — partial. Production carries `em_cura` status, and recipe tests now exist, but there is no dedicated lot QC screen: lot quality checklist, lot quality states, release/block/partial-loss decision with user+date. Recipe tests (formula validation) are a separate concept from per-lot QC.
- [ ] **Returns / exchanges full flow** (PRD 7.20 / screen 8.19 / accept. 25-26) — foundation only (incidents). Needs: incident-driven return with stock-impact decision (available / blocked-for-review / loss / discard), refund record in finance, and the rule that shipped orders cannot be cancelled directly.
- [ ] **Data export / backup (CSV portability)** (PRD 7.25 / accept. 38) — not built. Reports export specific report CSVs, but there is no entity export (items, stock, lots, movements, suppliers, customers, purchases, recipes, production, orders, finance, AI content, audit) with permission checks, pt-BR headers, no credentials, and an audit row per export.
- [ ] **Notifications / alert engine** (PRD 7.26) — in-memory empty list only. Needs real alert generation (low/zero stock, cura finished today, lot awaiting review, paid-not-separated, stalled order, open incident, bill due, ME disconnected/error, import pending, unmapped external SKU, low margin, label pending) with states and an action link.
- [ ] **Marketplace CSV preparation** (PRD 7.14) — not built (only a `channel` field on orders). MVP-level scope is intentionally CSV-based: register external channel, import CSV, store raw payload, external-SKU -> internal-item mapping, import-pending screen (unknown SKU, insufficient stock, duplicates, invalid data), attach external label PDF, manual tracking. Full API integrations are section I.
- [ ] **Packaging models + standalone freight calculator** (PRD 7.13) — verify/partial. Needs packaging-model CRUD (dimensions, weight, cost, capacity) and a standalone freight calculator with "copy message for WhatsApp".
- [ ] **Lot traceability** (PRD 7.7 / accept. 32) — partial. Trace which consumed material lots produced which output lot, and store produced-lot real cost.
- [ ] **In-app help completeness** (PRD 7.28 / accept. 40) — partial (a manual module exists). Verify contextual "Como usar esta tela?" per module, first-steps checklist, glossary, and keyword search.

---

## I. Channel and e-commerce integration roadmap (post-MVP)

Requested direction beyond the PRD's CSV-only marketplace prep (PRD 3.4 keeps full APIs out of the MVP). Build all of these on the existing secure pattern: per-tenant encrypted tokens in `integration_credentials`, scoped per provider, never exposed to the frontend, masked in logs, omitted from exports, with connect/disconnect/sync audit events (same model already used for Melhor Envio). Each integration must preserve manual fallback and the marketplace customer dedupe strategy in section C (external buyer id, document, email, phone, channel precedence).

- [ ] **Marketplace integrations (real APIs):**
  - Mercado Livre
  - Shopee
  - Amazon
  - TikTok Shop
  - Per provider: OAuth/token connect, order ingestion (-> internal orders with channel/source + raw payload), external-SKU mapping reuse, optional stock sync, and fulfillment/tracking status sync back. Out of scope still: ad publishing, price push, chat/claims, fiscal/NF-e.
- [ ] **E-commerce platform integrations:**
  - WooCommerce
  - Nuvemshop (Tiendanube)
  - Order ingestion + catalog/stock sync via each platform's API/webhooks.
- [ ] **Open platform option (own storefront + ERP):**
  - Expose an authenticated public API and webhooks so the user can build their own site/storefront and plug it into the ERP (create/import orders, read catalog/stock/availability, push fulfillment/tracking).
  - Token-scoped per company, audited, rate-limited; same secret-handling rules as above.
  - Lets the user choose between "use a marketplace/e-commerce connector" or "build my own site and integrate with the ERP" without changing the core.

Decision to make: pick the first integration to implement after the MVP gaps in section H are closed (likely Mercado Livre or Nuvemshop for the BR market), or prioritize the open API so the custom storefront path is unblocked first.

---

## Suggested sequencing

1. Manual QA for the current branch.
2. Melhor Envio sandbox validation with two tenants.
3. Validate label checkout/generation/print flow in sandbox.
4. Browser QA customer/store profile flows.
5. Close section H MVP gaps: pricing & margin, stock count, lot QC + post-cure release, data export, returns flow, notifications engine.
6. Marketplace CSV preparation (PRD 7.14).
7. Channel/e-commerce real integrations and/or the open API (section I).
