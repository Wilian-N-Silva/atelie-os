# Outstanding Work — consolidated

Compiled 2026-06-04 from all `docs/next-steps-*` files, `implementation-localstorage-removal-plan.md`, and verified code state. This is the single list of what is **not done yet**. Items marked ✅ in the source docs are omitted; only open work is listed.

Consolidated from the former `next-steps-*` handoff notes and `implementation-localstorage-removal-plan.md` (all now removed — Phases 1–6 of that plan are done; Phases 7–8 are captured below as sections C and D).

---

## A. Verification debt (do before merging current branch)

The localStorage-removal + recipes/production migration (commit `4fb3b02`) passed tsc/lint/build/seed but was **never exercised in the running app**.

- [ ] Manual click-through: Receitas (create + new version), Produção (plan OP, kanban), Pedidos (stepper/status/new order), Operação (scan order + OP), Etiquetas (item/lote/op/**local** options now from DB).
- [ ] Manual QA — Etiquetas: create sheet model; edit existing model dimensions; change default barcode type and confirm preview; add labels with different barcode types; skip used positions; remove queued label clears stale feedback; browser print renders only label pages.
- [ ] Manual QA — Workflows: load each production preset → columns update; rename steps → records stay mapped by technical key; toggle flags/automations; move/archive steps; Pedido drawer stepper reflects configured order flow.
- [ ] Physical barcode validation: Code 128 / Code 39 / EAN-13 / QR on the real printer + scanner. If unreliable, replace the visual renderer with a standards-compliant encoder for print.
- [ ] Regression QA: new order with overstock warning + custom price; payment confirmation; order pick-list barcode handoff into Operação; production pick-list handoff; recipe version creation; inventory dialogs.
- [ ] Run `npm run test` (existing unit suites — not run this session).
- [ ] Confirm migrated data (recipes, production, orders, branding, workflows, label settings) survives reload, sign-out/sign-in, and a second browser session.
- [ ] Confirm critical writes produce audit rows (`recipe.*`, `production.*`, `order.*`, `branding.update`, `workflow.update`, `stock.*`) and that company-settings/workflow/label writes are role-restricted to owner/admin.

---

## B. Status transitions & stock automations (functional gaps found in code)

These are real holes in the recipes/production slice just shipped:

- [ ] **Persist production status transitions.** `updateProduction` (PATCH `/api/app/production`) exists but has **no caller**. The Produção drawer buttons ("Finalizar produção", "Estender cura", "Liberar lote") and the Operação finalize flow are no-ops — advancing an OP does not survive reload. Wire these buttons + the kanban to call `updateProduction`.
- [ ] **Production stock automations.** Workflow automation types (`reserve_stock`, `consume_materials`, `create_output_lot`, `block_stock_availability`, `release_stock_availability`, `mark_shipped`, …) are defined and `stock-balance-math.ts` already interprets `production_consumption`/`production_output`, but **nothing records those movements**. Per PRD/CLAUDE invariants: finishing a production order must consume materials, create the produced lot, and record losses/consumed lots/cost/user/date; order payment should reserve stock; shipment should write `order_shipment`. None of this is wired yet.
- [ ] Confirm order status transitions in Operação (separation → conference → packaging → shipped) persist via `updateOrder` end-to-end, not just local state.

---

## C. Plan Phase 7 — remaining product modules (net-new, not started)

Plan Phase 7. Each must start backend-backed and tenant-scoped; no `localStorage`.

- [ ] **Audit-log screen** (read-only; data already exists in `audit_logs`) — recommended first, lowest effort.
- [ ] Purchases & suppliers.
- [ ] Managerial finance.
- [ ] Simple reports + CSV export.
- [ ] Incidents, exchanges, and returns (note: a shipped order cannot be cancelled directly — needs incident/return flow).
- [ ] Quality control, lots, and checklists.
- [ ] Suggested replenishment.
- [ ] Shipping / Melhor Envio integration (optional integration; manual freight/label/tracking must keep working without it).
- [ ] External channels & marketplace imports.

---

## D. Plan Phase 8 — AI text content (not started; intentionally last)

From plan Phase 8. The AI screen (`src/screens/ai-content.tsx`) is currently a **client-side placeholder** (local `AI_TEMPLATES`/`BRAND_VOICE`/`AI_HISTORY`, fake `setTimeout` generation).

- [ ] Backend-only AI generation API (no provider calls from the frontend).
- [ ] Persistence for brand voice, templates, generations, draft text, approved text, and history.
- [ ] Use real tenant data (items/recipes/orders/production/branding/workflows) as generation context.
- [ ] Text-only; no auto-publish; output editable before approval.
- [ ] Permissions + audit logs for AI generation, approval, and saved content.

---

## E. Inventory module follow-ups

Manual inventory movements are implemented; these are the open enhancements:

- [ ] Decide whether inventory permissions need a finer matrix beyond owner/admin write.
- [ ] Inventory movement detail / audit view (who made a manual adjustment and why).
- [ ] Recent-movements filtering by item, type, location, actor, date range.
- [ ] Empty-state handling in the movement modal (missing blocked location, no active locations, no catalog items).
- [ ] Decide whether `purchase_entry` should capture supplier, invoice/reference, unit cost, lot metadata.
- [ ] Decide whether losses require a reason category (breakage, expiration, count correction, production waste).
- [ ] DB-level constraints for positive quantities and valid source/destination expectations.
- [ ] Dedicated stock-ledger export for reconciliation/accounting.

---

## F. Demo / fixture cleanup leftovers

Runtime fixtures are gone (commit `4fb3b02`). One open decision remains:

- [ ] **Named fake people in committed seeds.** `src/db/seed-data.ts` still ships named customers (Marina Alves, Beatriz Lemos, …) and a production assignee ("Camila"). These are demo data living in DB seeds (the sanctioned place per current direction), but the cleanup doc asks to remove named fake people from committed source. Decide: keep as seed-only sample data, or neutralize names. Company/owner identity is already sourced from `SEED_*` env vars.

---

## G. Documentation hygiene

- [ ] **`HANDOFF.md` is stale** — "Last updated 2026-06-02", still says the active slice is `feature/inventory-module` and predates orders/recipes/production/branding/workflow persistence. Refresh to reflect current state (Phases 1–6 done, statuses DB-driven, demo data purged) and current branch `feature/remove-localstorage-persistence`.
- [ ] Foundation-hardening doc asked to keep `HANDOFF.md`/`CLAUDE.md` in sync with the real stack — re-verify after HANDOFF refresh.

---

## H. Open decisions / optional refinements

- [ ] Seed `design/**` prototype edits are uncommitted and unrelated; keep separate from active-app commits unless explicitly syncing the prototype.
- [ ] Working tree carries LF/CRLF line-ending noise on many `.ts/.tsx` files (repo is `core.autocrlf=true`; no real content diff). Optionally `git add --renormalize .` to clean.
- [ ] Status field types were widened to `OrderStatus | (string & {})` etc.; the `*Status` unions now document only the default keys. Fine as-is; revisit if a stricter contract is wanted.
- [ ] Recipe/production create/edit are currently open to any active company member (not role-gated), consistent with operational use; company-settings/workflow/label writes remain owner/admin. Decide if recipes/production need a role gate.

---

## Suggested sequencing

1. **A + B** — verify the shipped slice in-app and close the production status-persistence / stock-automation gaps (these make the recipes/production module actually usable, not just persistent).
2. **G** — refresh `HANDOFF.md`.
3. **C: audit-log screen** — cheap Phase-7 starter on existing data.
4. Then the heavier Phase-7 modules and Phase-8 AI, each on its own branch.
