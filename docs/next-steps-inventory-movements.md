# Next Steps: Inventory Movements

## Summary

Manual inventory movements are now implemented and committed in `6df0121 Add manual inventory movements`. The hardening pass in `c21312a Add manual screen and restrict write actions by role` added owner/admin write authorization for catalog and inventory mutations. The coverage pass in `2f966de Add inventory movement validation coverage` added focused unit coverage for parser validation, source capacity, and block/release balance math. The next slice should focus on auditability and operational usability.

## Current State

- `POST /api/app/inventory/movements` creates manual movements for purchase entry, transfer, loss, block, and release.
- Inventory movement creation validates item, active locations, blocked-location rules, required reason, and source stock capacity.
- Movement inserts also write an audit log entry.
- The inventory screen has a `Novo movimento` modal and reloads balances after save.
- Per-location stock balance handling now reflects block and release movements between normal and blocked locations.
- Catalog item create/update, item stock adjustment, and inventory movement creation are limited to `owner` and `admin`.
- Operator UI no longer shows catalog edit, item stock adjustment, or inventory movement creation controls.
- `npm.cmd test` covers `parseInventoryMovementInput`, source-capacity validation, and block/release stock balance math.
- Manual QA was completed by the user.

## Verified

- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`
- App running locally at `http://localhost:3000`
- Manual inventory movement flow tested in the UI.
- Operator API probes for catalog and inventory mutations return `403`.

## Recommended Next Steps

- Decide whether inventory permissions need a finer matrix beyond the current owner/admin write policy.
- Add an inventory movement detail or audit view so users can inspect who made a manual adjustment and why.
- Improve recent movements filtering with item, type, location, actor, and date range filters.
- Add empty-state handling in the modal for missing blocked locations, missing active locations, and no catalog items.
- Decide whether manual `purchase_entry` should capture supplier, invoice/reference number, unit cost, or lot metadata.
- Decide whether losses should require a reason category, such as breakage, expiration, count correction, or production waste.
- Add database-level constraints where practical for positive quantities and valid source/destination expectations.
- Consider a dedicated stock ledger export for reconciliation and accounting review.

## Test Plan For The Next Slice

- Run `npm.cmd run lint`.
- Run `npm.cmd test`.
- Run `npm.cmd run build`.
- Seed a local database and verify all five movement types against at least two active locations plus one blocked location.
- Confirm insufficient stock returns `409` and does not insert stock movements or audit logs.
- Confirm unauthenticated requests return `401`.
- Confirm users without company access cannot create movements.
- Confirm recent movements show the new entries with the right origin, destination, actor, reason, and quantity sign.

## Assumptions

- Manual inventory movement creation should remain company-scoped through `src/lib/app-route-context.ts`.
- The current single-company UI is acceptable for now.
- Lot and supplier tracking can be added later without blocking the current stock ledger.
