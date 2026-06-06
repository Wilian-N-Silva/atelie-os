# Feature Log — Atelie OS

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
