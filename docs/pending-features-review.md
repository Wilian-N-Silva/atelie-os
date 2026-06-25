# Pending Features Review

Updated: 2026-06-23

Source documents:

- `docs/feature-log.md`
- `docs/prd-v2.1-atelie-os-instante-ambar.md`
- `docs/outstanding-work.md`

This document lists the product features that are still missing or only partially covered against the PRD and current feature log. It is intentionally separate from `outstanding-work.md`, which also contains QA, merge, and production-readiness tasks.

---

## MVP Feature Gaps

- [ ] Packaging models and standalone freight calculator
  - CRUD for package profiles with dimensions, weight, packaging cost, and capacity.
  - Standalone freight calculator outside the order flow.
  - Copyable shipping quote/message for WhatsApp.

- [ ] Lot traceability
  - [x] Track which consumed material lots produced each output lot through an explicit material-lot selection step.
  - [x] Store and surface produced-lot real cost from production consumption movements.
  - [x] Connect material consumption, production output, QC, and stock release in a single production-lot traceability view.
  - [ ] Backfill historical/seed movements where trace metadata is missing.

- [ ] In-app help completeness
  - Verify every major module has contextual "Como usar esta tela?" help.
  - Add first-steps checklist.
  - Add glossary and keyword search.

- [ ] Full unit-conversion engine
  - Convert compatible units in recipes and stock, for example `1000 g = 1 kg`.
  - Keep unit `code` stable while allowing tenant display names.
  - Define conversion factors by unit kind.

- [ ] More complete reports and exports
  - Production summary export.
  - Date-range filters for existing CSV exports.
  - Saved report presets.
  - Sales, production, and purchase trend summaries.
  - Export more entities: lots, movements, recipes, production, and AI history.

- [ ] AI content hardening
  - Brand-voice settings model.
  - Tenant data context controls.
  - Saved prompt/template management.
  - Approval workflow beyond generated-history persistence.

- [ ] Notifications phase 2
  - Add rules for stalled orders, disconnected integrations, pending imports, and low margin.
  - Add per-rule mute/disable options.

---

## Partial Features Needing Product Completion

- [ ] Pricing and margin phase 2
  - Persisted per-channel fee rules in settings.
  - Richer labor-cost model.

- [ ] Stock count phase 2
  - Per-location stock counts.
  - Loss-reason categories for count adjustments.

- [ ] Quality control and lots phase 2
  - Real `inventory_lots` model.
  - [x] Partial lot approval/rejection.
  - [x] Required loss/approval reasons.
  - Stronger block/release stock link to QC status.
  - First slices delivered: production drawer now shows lot trace, real cost, QC outcome, output/release/loss quantities, and consumed-material rows; quality review supports partial approval and reason enforcement.
  - Material-lot selection delivered as a beta slice using purchase/stock movement lot metadata; the dedicated `inventory_lots` model remains pending.

- [ ] Returns and exchanges phase 2
  - Enforce that shipped orders cannot be cancelled directly.
  - More explicit replacement flow.
  - Stronger connection between incident resolution and customer/order history.

- [ ] Marketplace CSV import follow-ups
  - Attach external label PDF to imported orders.
  - Save manual tracking for imported orders.
  - Customer dedupe into the customers table.

- [ ] Label printing/editor follow-ups
  - Browser QA for the full label type editor.
  - Physical printer/scanner validation for Code 128, Code 39, EAN-13, and QR.
  - Validate circular 6x6 cm thermal labels on the real printer.
  - Confirm all tenant label types survive reload, sign-out/sign-in, and second browser session.

---

## Integrations Roadmap

- [ ] Mercado Livre completion
  - Test with real seller orders.
  - Customer dedupe.
  - Webhook event processing.
  - Tracking/status sync back into internal orders.
  - Optional stock sync/update to Mercado Livre.

- [ ] Nuvemshop completion
  - Test with real app credentials.
  - Order ingestion into `import_orders`.
  - Catalog/stock sync.
  - Webhooks.
  - Treat as conditional because API access is plan-gated by Nuvemshop.

- [ ] Shopee integration
  - OAuth/token connection.
  - Order ingestion.
  - External SKU mapping reuse.
  - Optional stock sync.
  - Fulfillment/tracking status sync.

- [ ] Amazon integration
  - OAuth/token connection.
  - Order ingestion.
  - External SKU mapping reuse.
  - Optional stock sync.
  - Fulfillment/tracking status sync.

- [ ] TikTok Shop integration
  - OAuth/token connection.
  - Order ingestion.
  - External SKU mapping reuse.
  - Optional stock sync.
  - Fulfillment/tracking status sync.

- [ ] WooCommerce integration
  - API credential setup.
  - Order ingestion.
  - Catalog/stock sync.
  - Webhooks where available.

- [ ] Open API / own storefront path
  - Authenticated public API for a separate storefront.
  - Endpoints for catalog, stock/availability, order creation/import, and fulfillment/tracking.
  - Company-scoped tokens, audit logging, and rate limiting.
  - Webhooks for order/status changes.

- [ ] Public tracking follow-ups
  - Rate limiting and abuse protection.
  - Company scoping for order number + email/CEP lookup once public company slugs exist.
  - Optional richer status-history table if more detailed event timestamps are needed.

---

## Production Readiness Features

- [ ] Email via Resend
  - Password reset.
  - Team invites.
  - Server-only API key configuration.

- [ ] File storage via Cloudflare R2
  - Storage abstraction for external label PDFs, attachments, generated documents, proofs, and import files.
  - S3-compatible server-side client.

- [ ] Permissions enforcement
  - Apply role-gating across purchases, finance, incidents, recipes, production, settings, workflows, labels, and admin writes.
  - Review whether inventory needs a finer permission matrix.

- [ ] Real-tenant onboarding
  - Let a new company configure units, locations, items, workflows, label types, and shipping data without relying on seeds.
  - Remove or neutralize named fake data from production-oriented seeds if needed.

---

## Deferred / Out Of MVP

- [ ] Automatic stock sync to every marketplace.
- [ ] Marketplace ad publishing.
- [ ] Marketplace price push.
- [ ] Chat/claims integrations.
- [ ] Fiscal/NF-e.
- [ ] Full omnichannel operations.
- [ ] Instagram publishing automation.
- [ ] Image/video generation.
