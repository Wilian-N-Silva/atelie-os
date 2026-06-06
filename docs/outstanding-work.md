# Outstanding Work - consolidated

Updated 2026-06-05 after the secure integrations / core ops slice and the first live Melhor Envio quote implementation.

This file lists what is still not done. Items already implemented in the local branch are kept out of the backlog even if older session notes mentioned them as future work.

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

These are no longer future feature ideas; they exist in the current local code and need QA/hardening:

- [x] DB-backed recipes and production.
- [x] DB-driven order and production status display.
- [x] Runtime business fixture purge; demo data now lives in seeds.
- [x] Order and production workflow stock automations.
- [x] Audit-log screen.
- [x] Suppliers and purchases.
- [x] Managerial finance.
- [x] Simple reports.
- [x] Incidents / returns foundation.
- [x] Shipping settings and secure Melhor Envio OAuth credential storage.
- [x] Backend OpenAI text generation with server-only key and persisted generation history.
- [x] Melhor Envio quote route now calls the external calculate endpoint when OAuth is connected, with refresh-token retry and manual fallback.
- [x] Melhor Envio webhook endpoint validates `X-ME-Signature` and records signed label events in audit logs.
- [x] Selected Melhor Envio quotes can be applied to orders, persisting carrier, service, price, deadline, and selection timestamp.
- [x] Selected quotes can be inserted into the Melhor Envio cart from the order drawer, persisting external label id/protocol/status on the order.
- [x] Label checkout, generation, preview, and print actions are wired from saved Melhor Envio label ids.
- [x] Customer base foundation: order creation can search/create/update customers, link orders to `customer_id`, and keep channel/source metadata for future marketplace imports.
- [x] ViaCEP lookup proxy for filling customer and shipping addresses.
- [x] Store/sender/fiscal profile fields in shipping settings, reused by label sender inputs.
- [x] Sellable item logistics validation for weight and dimensions, with order quote defaults derived from item package data.
- [x] Suggested replenishment screen and API, based on stock minimums, available balance, open order demand, and open production material demand.

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

---

## F. Demo / seed data decision

- [ ] Decide whether to keep named fake people in committed seed data or neutralize them. Runtime fixtures are gone, and seed-only sample data is sanctioned, but older cleanup notes asked to remove named fake people from committed source.

---

## G. Documentation hygiene

- [ ] Refresh `HANDOFF.md`; it still predates the localStorage-removal, recipes/production, core ops, secure integrations, and AI backend work.
- [ ] Re-check `CLAUDE.md` against the real stack after the handoff refresh.
- [ ] Keep `docs/integration-melhor-envio.md` updated as quote, label, and tracking flows move from beta foundation to live integration.

---

## Suggested sequencing

1. Manual QA for the current branch.
2. Melhor Envio sandbox validation with two tenants.
3. Validate label checkout/generation/print flow in sandbox.
4. Browser QA customer/store profile flows.
5. QC/lots/checklists.
6. Returns/exchanges hardening.
7. Marketplace imports.
