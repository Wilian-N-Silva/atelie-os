# Outstanding Work - beta launch

Updated 2026-06-25 after consolidating the recent feature work into `development`.

This file is the current operational backlog. Completed feature coverage lives in
`docs/pending-features-review.md` and `docs/feature-log.md`; this file should only
track manual QA, beta blockers, hardening, and integration work that is still open.

---

## A. Manual QA gates

- [ ] Full browser click-through: Dashboard, Itens/SKUs, Estoque, Compras, Receitas, Producao, Pedidos, Operacao, Etiquetas, Financeiro, Relatorios, Incidentes, Auditoria, IA, Ajuda, and Configuracoes.
- [ ] New-tenant smoke test: create a tenant without seed data and confirm labels, themes, team members, workflows, units, locations, and settings are isolated from the seed tenant.
- [ ] Standalone/self-hosted smoke test: enable standalone mode, confirm sign-up/onboarding are hidden or blocked, login copy is custom, and `app.clientsite.com` style deployments resolve the intended tenant.
- [ ] Label QA: create/edit sheet models, change default barcode type, print item/lot/OP/location labels, skip used positions, and confirm browser print renders only label pages.
- [ ] Physical barcode QA: print Code 128, Code 39, EAN-13, and QR on the real printer/scanner setup. Confirm scanner input does not append check digits or route to the wrong entity.
- [ ] Operation-mode scan QA: scan order, production, recipe-test, item/SKU, lot, and location codes. Confirm the configured barcode prefix/start range resolves the expected kind.
- [ ] Lot traceability QA: create purchase lot, consume selected material lots in production, produce output lot, partially approve/reject in quality, release stock, and inspect the production lot trace view.
- [ ] Partial-feature QA: pricing channel rules, labor model, per-location counts, loss reasons, returns/replacements, CSV import follow-ups, expanded exports, contextual help, and notification rule mute.
- [ ] Confirm data survives reload, sign-out/sign-in, and a second browser session.
- [ ] Confirm critical writes produce audit rows and role restrictions hold for settings, workflow, labels, inventory, finance, purchases, recipes, production, and admin-only writes.

Latest automated verification:

- [x] `npm.cmd run lint` passed on 2026-06-25.
- [x] `npx.cmd tsc --noEmit` passed on 2026-06-25.
- [x] `npm.cmd test` passed on 2026-06-25: 77 tests passed.

---

## B. Beta launch blockers

- [ ] Manual QA above completed or explicitly accepted as residual risk.
- [ ] Confirm `.env.example` covers production/self-hosted deployment variables: auth secret, app URL, database, integration secret key, Resend, R2, standalone flags, and provider credentials.
- [ ] Confirm real-tenant bootstrap creates neutral defaults and does not copy seed tenant labels, themes, or team data.
- [ ] Decide beta default for printer routing. Current app relies on browser print dialogs; default printer selection per document type is a browser/OS concern unless we add a local print agent or managed kiosk flow.
- [ ] Confirm backup/export path for the first tenant before production data entry starts.

---

## C. Shipping / Melhor Envio

- [ ] Sandbox QA with at least two tenants and two Melhor Envio accounts.
- [ ] Validate quote payloads against real package profiles and carrier constraints.
- [ ] Reconnect sandbox OAuth with the final scopes and validate cart, checkout/payment, async generation, preview, and print.
- [ ] Validate webhooks update internal order tracking/status history.
- [ ] Add or confirm reconnect UX for expired refresh tokens.
- [ ] Add integration-level error telemetry without exposing tokens or provider payload secrets.
- [ ] Browser QA customer autocomplete, ViaCEP fill, incomplete-customer warning, and sender profile prefill in label form.

Manual freight, labels, and tracking must remain available when Melhor Envio is disconnected or unavailable.

---

## D. Core beta hardening

- [ ] Role policy review after manual QA; tighten any route that still allows broader writes than the UI implies.
- [ ] Decide whether inventory permissions need a finer matrix beyond owner/admin write.
- [ ] Add DB-level constraints for positive quantities and valid source/destination expectations where practical.
- [ ] Add inventory movement detail/audit view for manual adjustments and automated stock movements.
- [ ] Add recent-movements filtering by item, type, location, actor, and date range.
- [ ] Add empty-state handling in movement modals for missing blocked location, no active locations, and no catalog items.

---

## E. Integrations roadmap

Detailed feature status is in `docs/pending-features-review.md`.

- [ ] Mercado Livre completion: real seller orders, customer dedupe, webhook event processing, tracking/status sync, optional stock sync.
- [ ] Nuvemshop completion if the target plan supports API access: order ingestion, catalog/stock sync, webhooks.
- [ ] Pick the next channel by beta need: Shopee, Amazon, TikTok Shop, WooCommerce, or Open API / own storefront.
- [ ] Open API / own storefront path: authenticated catalog, stock/availability, order creation/import, fulfillment/tracking, company-scoped tokens, audit logging, and rate limiting.

---

## F. Documentation hygiene

- [ ] Refresh `HANDOFF.md`; it predates most DB-backed core, integrations, AI, production-readiness, tenant isolation, and standalone work.
- [ ] Re-check `CLAUDE.md` against the real stack after the handoff refresh.
- [ ] Keep `docs/integration-melhor-envio.md` updated as quote, label, and tracking flows move from beta foundation to live integration.
- [ ] Delete or archive `docs/protocolo.md` after confirming the recipe-test protocol is fully covered by the PRD/manual/help content.

---

## Suggested sequence

1. Manual QA on `development`, starting with tenant isolation, labels/barcodes, lot traceability, and standalone mode.
2. Fix any beta blockers found in QA.
3. Melhor Envio sandbox validation with two tenants.
4. Production/self-hosted env review.
5. First-user beta deployment.
6. Next integration or Open API path based on the first user's actual sales channel.
