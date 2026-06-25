# QA Checklist - beta manual QA

Manual browser QA before the first beta deployment. Login with the configured seed/admin user for dev, then repeat key flows with a new tenant created from scratch.

For feature status, launch gates, and integration priority, see `docs/feature-map.md`.

## 0. Setup

- [ ] `docker compose up -d postgres` / `npm run db:migrate` / `npm run db:seed` / existing dev server is running.
- [ ] `.env`: app URL and auth URL point to the same local origin.
- [ ] Login works; dashboard loads.
- [ ] New tenant can be created and selected.

## 1. Tenant isolation

- [ ] New tenant does not see seed tenant labels, themes, team members, workflow edits, units, locations, or settings.
- [ ] Editing labels/themes/team in one tenant does not affect another tenant after reload and sign-out/sign-in.
- [ ] Team endpoint only lists users for the active tenant.
- [ ] Switching active company updates server-rendered settings and API reads.

## 2. Standalone/self-hosted mode

- [ ] With standalone flags enabled, sign-up UI is hidden and sign-up API attempts are blocked.
- [ ] Onboarding is skipped/blocked where appropriate.
- [ ] Login screen shows the configured client copy/brand.
- [ ] A client subdomain style app URL resolves the expected company context.

## 3. Labels and barcodes

- [ ] Create and edit sheet models, including A4 and circular/thermal definitions.
- [ ] Change default barcode type and confirm preview/print output.
- [ ] Print item, lot, OP, order, and location labels.
- [ ] Scanner reads printed codes without adding unexpected digits or losing leading zeroes.
- [ ] Operation mode resolves scanned prefixes/ranges to the correct kind: order, production, recipe test, item/SKU, lot, or location.
- [ ] Invalid/ambiguous scans show a useful error and do not mutate data.

## 4. Orders and shipping

- [ ] Creating an order with custom price and overstock warning works.
- [ ] Payment confirmation updates status and audit.
- [ ] Pick list handoff into Operation mode works.
- [ ] Melhor Envio sandbox: quote -> cart -> checkout/generate -> preview/print.
- [ ] Manual tracking and external label attachments work for imported/manual orders.
- [ ] Public tracking works by token and by company + order + email/CEP; invalid lookup returns not found.

## 5. Production, lots, and quality

- [ ] Recipe version creation and approval flow work.
- [ ] Recipe-test label scan opens the five test criteria in Operation mode.
- [ ] Production planning consumes selected material lots.
- [ ] Produced lot stores real cost and trace metadata.
- [ ] Quality review supports partial approve/reject/loss with required reasons.
- [ ] Released quantity reaches sellable stock; rejected/loss quantity does not.
- [ ] Production drawer trace view shows consumed lots, output lot, QC outcome, released/loss quantities, and real cost.

## 6. Inventory and counts

- [ ] Per-location count snapshots expected stock correctly.
- [ ] Count adjustment requires/records loss reason where applicable.
- [ ] Movement history and audit entries are created for manual and automated movements.
- [ ] Empty states are acceptable for no active locations, no blocked location, and no catalog items.

## 7. Pricing, reports, AI, and notifications

- [ ] Pricing uses channel fee rules and labor model; low-margin alert is correct.
- [ ] Exports include expanded entities and date filters.
- [ ] Saved report presets and trend summaries load.
- [ ] AI brand voice, tenant context controls, saved templates, and approval flow work.
- [ ] Notification rules include stalled orders, disconnected integrations, pending imports, low margin, and mute/disable behavior.

## 8. Permissions and audit

- [ ] Owner/admin can manage settings, workflows, labels, team, and integrations.
- [ ] Operator can perform expected order/production/incident workflows but cannot change admin settings.
- [ ] Finance role can access intended finance areas without broader admin writes.
- [ ] Readonly role cannot mutate data.
- [ ] Critical writes produce audit rows with tenant and actor.

## 9. Regression

- [ ] `npm run lint`, `npx tsc --noEmit`, and `npm test` are green before handoff.
- [ ] Data survives reload, sign-out/sign-in, and second browser session.
- [ ] Browser print output contains only intended print pages.
