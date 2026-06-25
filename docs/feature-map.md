# Feature Map

Updated 2026-06-25.

This is the single product-facing map for feature status, beta readiness, and
integration direction. Keep QA procedure in `qa-checklist.md`; keep provider API
details in the integration runbooks.

Status legend:

- `Done` - implemented and covered by automated checks where practical.
- `Needs QA` - implemented but still requires manual/browser/hardware validation.
- `Blocked` - cannot be completed without an external account, credential, provider, or product decision.
- `Roadmap` - intentionally after beta.
- `Deferred` - explicitly out of MVP/beta.

## Beta Must Have

| Area | Feature | Status | Beta gate |
| --- | --- | --- | --- |
| Tenant | Tenant-scoped labels, themes, team, workflows, units, locations, settings | Needs QA | New tenant must not inherit seed tenant operational data. |
| Tenant | Active company context for server routes and session | Needs QA | Switching tenant must change API reads/writes consistently. |
| Deployment | Standalone/self-hosted mode | Needs QA | Sign-up/onboarding hidden or blocked; custom login copy; client subdomain works. |
| Labels | Label type editor, sheet templates, default barcode type | Needs QA | Browser reload, sign-out/sign-in, and second session must preserve settings. |
| Labels | Code 128, Code 39, EAN-13, QR, circular thermal definitions | Needs QA | Physical printer/scanner validation. |
| Scanner | Operation mode barcode routing by configured prefix/start range | Needs QA | Orders, production, recipe tests, items/SKUs, lots, and locations route correctly. |
| Production | Material-lot selection and produced-lot traceability | Needs QA | Produced lot shows consumed lots, real cost, QC outcome, release/loss quantities. |
| Quality | Inventory lots, partial approval/rejection, required reasons | Needs QA | Released quantity becomes sellable; rejected/loss quantity does not. |
| Inventory | Per-location stock counts and loss reasons | Needs QA | Count adjustments write movements and audit rows. |
| Orders | Returns, replacements, shipped-order cancel guard | Needs QA | Incident flow handles restock/block/loss/refund/replacement. |
| Imports | Marketplace CSV follow-ups | Needs QA | External label PDF, manual tracking, and customer dedupe work. |
| Public tracking | Public tracking endpoint hardening | Needs QA | Token and company/order/email/CEP lookup work with rate limiting. |
| Pricing | Channel fees and labor model | Needs QA | Suggested/practiced prices and low-margin alerts match expected math. |
| Reports | Expanded exports, date filters, saved presets, trend summaries | Needs QA | CSV and report outputs are complete and readable. |
| AI | Brand voice, tenant context controls, templates, approval workflow | Needs QA | Generated content remains tenant-scoped and editable before approval. |
| Notifications | Stalled orders, disconnected integrations, pending imports, low margin, mute rules | Needs QA | Alerts route to the correct screens and mute state persists. |
| Permissions | Role-gated routes and UI actions | Needs QA | Owner/admin/operator/finance/readonly access matches beta policy. |
| Audit | Critical write audit coverage | Needs QA | Settings, workflows, labels, inventory, finance, purchases, recipes, production, and admin writes record actor and tenant. |

## Delivered Feature History

| Date | Area | Delivery |
| --- | --- | --- |
| 2026-06-04 | Core data | Recipes and production moved from localStorage to DB-backed tables; default workflows seeded; status display driven by workflow configuration. |
| 2026-06-04 | Runtime data | Runtime demo data removed from app screens; seed-only demo data retained for development. |
| 2026-06-05 | Operations | Suppliers, purchases, finance, reports, incidents, shipping settings, audit logs, and BRL helpers added. |
| 2026-06-05 | Integrations | Melhor Envio secure multi-tenant OAuth, encrypted credentials, signed state, connect/disconnect, quote/cart/label/tracking flows. |
| 2026-06-05 | AI | Server-side text generation, local fallback, generation history, approval audit. |
| 2026-06-05 | Customers | Customer table, order customer linking, ViaCEP proxy, sender/store profile, logistics fields. |
| 2026-06-06 | Orders | Dedicated order detail screen, shipping flow, tracking persistence, webhook company scoping. |
| 2026-06-06 | Recipes | Recipe approval and recipe-test barcode flow with fixed quality criteria. |
| 2026-06-06 | Pricing | Pricing screen and API with recipe cost, average cost override, labor/extras, margin, practiced price history. |
| 2026-06-06 | Kits | Assembled and virtual kit handling, virtual component stock reservation/shipment, pick list and operation expansion. |
| 2026-06-06 | Inventory | Stock count foundation and quality review foundation. |
| 2026-06-06 | Exports | CSV export foundation for core entities. |
| 2026-06-06 | Notifications | Derived notification center for stock, lots, paid orders, and payables. |
| 2026-06-06 | Incidents | Return/exchange resolution with stock impact and optional refund. |
| 2026-06-06 | Catalog | Tenant-editable units and categories, protected canonical units. |
| 2026-06-06 | Public API | Public order tracking endpoint and reusable tracking mapper. |
| 2026-06-07 | Navigation | Collapsible sidebar groups and screen consolidation under parent modules. |
| 2026-06-07 | Mercado Livre | OAuth foundation, status endpoint, webhook stub, and manual recent-order sync into import staging. |
| 2026-06-07 | Nuvemshop | OAuth foundation, status endpoint, and webhook stub. |
| 2026-06-25 | MVP closure | Packaging profiles, standalone freight calculator, lot traceability, help, unit conversion, reports, AI hardening, notification rules, pricing phase 2, stock count phase 2, returns phase 2, CSV import follow-ups. |
| 2026-06-25 | Beta readiness | Label persistence, public tracking hardening, transactional email infrastructure, permission enforcement, real-tenant bootstrap, tenant isolation, standalone/self-hosted mode. |

## Production Readiness

| Feature | Status | Notes |
| --- | --- | --- |
| Email via Resend | Needs QA | Password reset, magic link sign-in, and team invites are wired to server-side Resend sending; validate with the first-client sender/domain. |
| File storage via Cloudflare R2 | Done | Storage abstraction for external labels, attachments, generated documents, proofs, and import files. |
| Permission enforcement | Needs QA | Route policy exists; beta QA must verify practical role behavior. |
| Real-tenant onboarding | Needs QA | New tenants receive neutral defaults and production seed guard prevents accidental demo data. |
| Environment documentation | Needs QA | Confirm `.env.example` covers production and standalone variables. |
| Backup/export path | Needs QA | First tenant needs an agreed data export/backup path before production use. |
| Printer routing | Blocked | Browsers do not allow reliable per-document default printers. Requires OS/browser choice, kiosk mode, or a local print agent. |

## Integrations

Provider-specific API notes stay in their runbooks. This section tracks product
priority and integration status.

| Integration | Status | Next step |
| --- | --- | --- |
| Melhor Envio | Needs QA | Sandbox validation with two tenants/accounts, final scopes, cart/checkout/generate/preview/print, webhooks, reconnect UX. |
| Public tracking API | Needs QA | Validate customer lookup by token and company/order/email/CEP from an external site. |
| Mercado Livre | Roadmap | Test real seller orders, customer dedupe, webhook event processing, tracking/status sync, optional stock sync. |
| Nuvemshop | Blocked | API access is plan-gated; continue only with a plan that supports API access. |
| Shopee | Roadmap | OAuth/token connection, order ingestion, SKU mapping, optional stock sync, fulfillment/tracking sync. |
| Amazon | Roadmap | OAuth/token connection, order ingestion, SKU mapping, optional stock sync, fulfillment/tracking sync. |
| TikTok Shop | Roadmap | OAuth/token connection, order ingestion, SKU mapping, optional stock sync, fulfillment/tracking sync. |
| WooCommerce | Roadmap | API credentials, order ingestion, catalog/stock sync, webhooks where available. |
| Open API / own storefront | Roadmap | Authenticated catalog, stock/availability, order creation/import, fulfillment/tracking, scoped tokens, audit, rate limiting, webhooks. |

## Deferred / Out Of MVP

- Automatic stock sync to every marketplace.
- Marketplace ad publishing.
- Marketplace price push.
- Chat/claims integrations.
- Fiscal/NF-e.
- Full omnichannel operations.
- Instagram publishing automation.
- Image/video generation.

## Launch Checklist

- [ ] Manual QA completed from `docs/qa-checklist.md`, or accepted as residual risk.
- [ ] Tenant isolation manually verified with a fresh tenant.
- [ ] Barcode print/scan manually verified on real hardware.
- [ ] Standalone/self-hosted mode manually verified if used for the first client.
- [ ] Melhor Envio sandbox validated if shipping labels are part of beta scope.
- [ ] Production/self-hosted environment reviewed.
- [ ] Backup/export path agreed before production data entry starts.
