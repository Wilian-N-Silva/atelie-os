# Documentation

Updated 2026-06-25.

This folder follows a simple documentation split:

- Product intent and status
- Operational QA and launch readiness
- Integration/API contracts
- Long-form reference material

## Source Of Truth

- `feature-map.md` - single product map for feature status, delivered history, beta gates, production readiness, integration priority, and deferred scope.
- `prd-v2.1-atelie-os-instante-ambar.md` - product specification and acceptance reference. Keep even when implementation is ahead.
- `qa-checklist.md` - manual QA procedure for the current beta branch.
- `git-workflow.md` - branch policy.
- `manual-base-atelie-os-instante-ambar.md` - long-form manual/reference draft.

## Integrations

Integration priority and product status live in `feature-map.md`.
Provider/API details stay in dedicated runbooks:

- `integration-melhor-envio.md` - Melhor Envio OAuth, tenant token handling, quote/label/tracking operations, sandbox notes.
- `integration-public-tracking.md` - public tracking API contract for a separate storefront/site.

Future provider runbooks should be added only when implementation starts or an
external contract needs exact setup instructions. Keep roadmap-only providers in
`feature-map.md`.

## Removed Or Merged

- `pending-features-review.md` - merged into `feature-map.md`.
- `outstanding-work.md` - merged into `feature-map.md` and `qa-checklist.md`.
- `feature-log.md` - merged into the delivered history section of `feature-map.md`.
- `protocolo.md` - removed; the fixed recipe-test criteria now live in code, PRD/manual context, and feature history.

## Maintenance Rules

- Add feature status changes to `feature-map.md`.
- Add manual validation steps to `qa-checklist.md`.
- Add provider-specific setup/API details to an integration runbook.
- Do not create a new planning doc when an existing source of truth can be extended.
