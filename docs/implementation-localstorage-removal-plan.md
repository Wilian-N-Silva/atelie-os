# Implementation Plan - LocalStorage Removal

## Summary

This plan defines the implementation order for removing `localStorage` from business data and tenant/company configuration in the active app. AI content is intentionally last because it should use real persisted context from items, recipes, orders, production, branding, and workflows.

Decisions:

- Remove `localStorage` from business data, tenant settings, branding, labels, workflows, orders, and operational progress.
- Temporary local UI preferences may remain only when they do not affect business data or shared company behavior.
- Current fixture data should become tenant-scoped database seeds.
- Authenticated app screens should read and write through APIs, not fixtures or browser storage.
- AI textual content is the final functional phase.

## Phase 1 - Persistence Foundation And Seeds

- Convert current demo data from `src/lib/screen-fixtures.ts` into seed data that can be inserted per company.
- Ensure onboarding/company creation can create the required baseline data when appropriate.
- Keep fixtures only as seed source or an explicit demo-mode input, not as the runtime source for authenticated screens.
- Keep all new business records scoped by `company_id`.
- Follow the existing API pattern: `requireAppRouteContext`, role checks, server-side validation, and JSON responses.

Acceptance:

- A newly onboarded company can receive baseline records without relying on browser storage.
- No authenticated business screen needs fixture data as its primary source after its migration phase is complete.

## Phase 2 - Company Settings And Branding

- Move company branding and theme tokens to `company_brand_settings` and `brand_themes`.
- Remove business-critical use of `atelie-brand`, `atelie-logo`, and similar keys from `localStorage`.
- Add or reuse settings APIs for reading and updating brand/company settings.
- Apply owner/admin write permissions for company-level settings.
- Record audit logs for branding/configuration changes.

Temporary allowance:

- Purely local UI preferences such as route memory, theme display preference, or density may stay temporarily if they do not represent company configuration.

Acceptance:

- Branding survives reloads, sign out/sign in, and use from another browser.
- Company branding does not depend on `localStorage`.

## Phase 3 - Workflows And Label Settings

- Replace the in-memory workflow store in `src/lib/workflows.ts` with database-backed APIs using `workflows` and `workflow_steps`.
- Persist workflow presets, active steps, order, colors, flags, automations, and archived state per company.
- Replace the in-memory label sheet and barcode setting store in `src/lib/label-sheets.ts` with database-backed APIs.
- Add tenant-scoped persistence for label sheet models and the default barcode type.
- Restrict workflow and label configuration edits to owner/admin roles.
- Add audit logs for workflow and label configuration changes.

Acceptance:

- Workflow edits remain after reload and are visible across browsers for the same company.
- Label sheet models and default barcode type remain after reload and are visible across browsers.
- `rg "useWorkflows|useLabelSheets|useBarcodeType"` no longer points to module-level in-memory stores.

## Phase 4 - Orders

- Add database schema and APIs for orders and order line items.
- Replace `src/lib/demo-order-overrides.ts` and order-related `localStorage` keys with backend persistence.
- Persist manual order creation, payment confirmation, order status, pick list state, freight, discounts, tracking, label type, notes, and channel.
- Seed initial orders from the current demo data when needed.
- Ensure order workflow status uses configured workflow steps by technical key.
- Add audit logs for order creation and status/payment changes.

Acceptance:

- Creating or updating an order survives reloads and is visible from another browser.
- Payment/status changes no longer use `localStorage`.
- Existing order, pick list, and operation handoff flows continue to work.

## Phase 5 - Recipes And Production

- Add database schema and APIs for recipes, recipe versions, recipe components, and production orders.
- Replace runtime usage of `DEMO_RECIPES` and `DEMO_PRODUCTION` in authenticated screens with API data.
- Persist production status, planned date, responsible person, quantities, selected recipe/version, and workflow step.
- Keep production workflow status mapped by technical key.
- Record stock movements for production automations when those automations are implemented.
- Add audit logs for recipe changes and production status changes.

Acceptance:

- Recipe edits and new versions survive reloads.
- Production planning and Kanban updates survive reloads.
- Production and operation screens use the same persisted production records.

## Phase 6 - Manual Progress And Notifications

- Move manual checklist progress to the existing help checklist tables.
- Remove `localStorage` from manual completion state.
- Persist notification state only when real backend notifications exist.
- Avoid browser storage for any progress that should follow the user across devices.

Acceptance:

- Manual checklist progress survives reload and another browser session.
- Notification read/resolved state is either backend-backed or not persisted until real notifications exist.

## Phase 7 - Remaining Product Modules

Implement the remaining modules after the core app is database-backed:

- Purchases and suppliers.
- Managerial finance.
- Simple reports and CSV export.
- Audit log screen.
- Incidents, exchanges, and returns.
- Quality control, lots, and checklists.
- Suggested replenishment.
- Shipping/Melhor Envio.
- External channels and marketplace imports.

Acceptance:

- New modules must start backend-backed and tenant-scoped.
- No new business module should introduce `localStorage` persistence.

## Phase 8 - AI Text Content

AI content is last.

- Implement AI only after the persisted context exists for items, recipes, orders, production, branding, workflows, and company settings.
- Add backend-only AI generation APIs.
- Add persistence for brand voice, templates, generations, draft text, approved text, and history.
- Use real tenant data as generation context.
- Keep AI limited to textual content.
- Do not auto-publish generated content.
- Add permissions and audit logs for AI generation, approval, and saved content.

Acceptance:

- AI generation does not call providers from the frontend.
- Generated content can be edited, saved as draft, approved, and reviewed later.
- AI output is based on persisted company/product context, not fixtures.

## Global Test Plan

- Run `npm.cmd run lint`.
- Run `npm.cmd run build`.
- Run `npm.cmd run test`.
- Search for forbidden storage usage with `rg "localStorage|sessionStorage" src`.
- Confirm any remaining storage usage is limited to non-business UI preferences.
- Verify migrated data survives reload, sign out/sign in, and another browser session.
- Verify role restrictions for all admin/company settings writes.
- Verify critical writes create audit logs.

## Completion Criteria

- No business data or tenant/company configuration depends on `localStorage`, `sessionStorage`, module-level stores, or runtime fixtures.
- Authenticated app screens use tenant-scoped APIs as their source of truth.
- Fixture data is limited to seeds or explicit demo mode.
- AI content is implemented only after the persisted operational context is available.
