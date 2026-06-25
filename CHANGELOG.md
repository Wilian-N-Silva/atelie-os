# Changelog

All notable changes to Atelie OS are documented here.

## 0.1.0 - 2026-06-25

Beta release for the first user.

### Highlights

- Multi-tenant, white-label backoffice foundation with company-scoped settings, themes, labels, team, workflows, and active tenant context.
- Standalone/self-hosted mode for client-owned subdomain deployments.
- DB-backed catalog, stock, purchases, recipes, production, quality/lots, orders, labels, shipping, finance, reports, incidents, audit, AI, help, and settings.
- Lot traceability with material-lot selection, produced-lot cost, inventory lots, partial quality release/rejection, and production trace view.
- Label editor and barcode printing support for Code 128, Code 39, EAN-13, QR, A4 sheets, and circular/thermal definitions.
- Public tracking API and page for customer-facing order status.
- Melhor Envio foundation with tenant OAuth, encrypted tokens, quotes, cart/checkout/generation/preview/print, and tracking/webhook support.
- Marketplace CSV import foundation and follow-ups for external labels, manual tracking, and customer dedupe.
- Production readiness foundations for Resend email, R2-compatible storage, permissions, production seed guard, and real-tenant bootstrap.

### Beta Gates

- Manual QA is tracked in `docs/qa-checklist.md`.
- Feature/readiness status is tracked in `docs/feature-map.md`.
- Physical barcode and printer validation must be performed on the real hardware before relying on scanner-heavy workflows.
